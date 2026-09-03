import "dotenv/config";
import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStore,
  getStore,
  hasDatabase,
  initStore,
  isDataKey,
  readAll,
  readData,
  readVersions,
  writeData,
} from "./store";

/**
 * 배포용 서버입니다.
 *
 * 하는 일이 둘뿐입니다.
 *   ① 앱 화면(빌드된 파일)을 내보냅니다.
 *   ② 매장 자료를 받아 창고에 담고, 달라면 꺼내 줍니다.
 *
 * 왜 새로 만들었나:
 *   원래 server/_core 는 이 프로젝트를 만든 도구(Manus)에 맞춰져 있어
 *   로그인·저장소 연결 등이 그 도구 안에서만 돕니다.
 *   바깥에 올리려면 그것들이 다 걸림돌이 되므로, 필요한 것만 새로 적었습니다.
 *
 * ⚠️ 지금 보안 수준:
 *   매장 코드를 아는 사람은 그 매장 자료를 읽고 쓸 수 있습니다.
 *   개인 번호(PIN)는 서버만 알고, 내려보내지 않습니다 (2026-09-03).
 *   작은 매장에서 서로 아는 사람끼리 쓰는 것을 전제로 한 수준입니다.
 *   (다음 단계: 들어온 사람에게 표를 주고 저장할 때 표를 확인하기)
 */

const app = express();
app.use(express.json({ limit: "2mb" }));

// ───────────────────────── 번호(PIN) ─────────────────────────
//
// 2026-09-03 까지는 번호가 자료 안에 그대로 담겨 내려갔습니다.
// 매장 코드만 알면 브라우저 개발자도구로 모든 사람 번호를 볼 수 있었습니다.
//
// 지금은
//   · 내려보낼 때 번호를 지웁니다 (hidePins)
//   · 올라온 목록에 번호가 비어 있으면 창고에 있던 것을 그대로 둡니다 (keepPins)
//   · 번호가 맞는지는 서버가 봅니다 (POST /login). 다섯 번 틀리면 5분 막습니다.
//
// 아직 안 되는 것: 매장 코드를 아는 사람이 자료를 고치는 것은 여전히 막지 않습니다.
// (그러려면 들어온 사람에게 표를 주고, 저장할 때마다 표를 확인해야 합니다. 다음 단계)

type MemberRow = { id?: unknown; name?: unknown; role?: unknown; pin?: unknown };

/** 번호를 지운 목록을 돌려줍니다. members 가 아니면 그대로. */
function hidePins(key: string, items: unknown[]): unknown[] {
  if (key !== "members") return items;
  return items.map((item) =>
    item && typeof item === "object" ? { ...(item as MemberRow), pin: "" } : item
  );
}

/**
 * 올라온 목록에서 번호가 빈 사람은 창고에 있던 번호를 그대로 둡니다.
 * 앱은 번호를 못 받으므로 저장할 때도 빈 채로 올립니다. 그걸 여기서 채웁니다.
 * 번호를 새로 적어 올리면(직원 추가·번호 바꾸기) 그 번호로 바뀝니다.
 */
async function keepPins(code: string, items: unknown[]): Promise<unknown[]> {
  const { items: current } = await readData(code, "members");
  const known = new Map<string, string>();
  for (const row of current as MemberRow[]) {
    if (row && typeof row.pin === "string" && row.pin) known.set(String(row.id), row.pin);
  }
  return items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const row = item as MemberRow;
    const pin = typeof row.pin === "string" ? row.pin : "";
    return pin ? row : { ...row, pin: known.get(String(row.id)) ?? "" };
  });
}

/** 틀린 횟수. 다섯 번 틀리면 5분 동안 막습니다 (번호가 네 자리라 마구 넣어 보는 것을 막으려고). */
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

app.post("/api/stores/:code/login", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const name = String(req.body?.name ?? "").trim();
  const pin = String(req.body?.pin ?? "");
  const lockKey = `${code}:${name}`;

  const lock = failures.get(lockKey);
  if (lock && lock.until > Date.now()) {
    const minutes = Math.ceil((lock.until - Date.now()) / 60000);
    res.status(429).json({ error: `번호를 여러 번 틀렸습니다. ${minutes}분 뒤에 다시 해 주세요.` });
    return;
  }

  try {
    const store = await getStore(code);
    if (!store) {
      res.status(404).json({ error: "그런 매장 코드가 없습니다." });
      return;
    }

    const { items } = await readData(code, "members");
    const found = (items as MemberRow[]).find((row) => row && row.name === name);

    if (!found || typeof found.pin !== "string" || found.pin !== pin) {
      const count = (lock?.count ?? 0) + 1;
      failures.set(lockKey, {
        count,
        until: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0,
      });
      res.status(401).json({ error: "이름과 번호가 맞지 않습니다." });
      return;
    }

    failures.delete(lockKey);
    res.json({ ok: true, role: found.role });
  } catch (error) {
    console.error("[api] 번호 확인 실패", error);
    res.status(500).json({ error: "번호를 확인하지 못했습니다." });
  }
});

// ───────────────────────── 매장 ─────────────────────────

/** 새 매장을 엽니다. 매장 코드를 돌려줍니다. */
app.post("/api/stores", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "매장 이름을 넣어 주세요." });
    return;
  }

  try {
    const code = await createStore(name.slice(0, 60));
    res.json({ code, name });
  } catch (error) {
    console.error("[api] 매장 만들기 실패", error);
    res.status(500).json({ error: "매장을 만들지 못했습니다." });
  }
});

/**
 * 판 번호만 알려 줍니다. 앱이 8초마다 부르는 곳이라 가장 가벼워야 합니다.
 *
 * 앱은 이걸 보고 "바뀐 종류만" 따로 받아 갑니다.
 * 전에는 8초마다 매장 자료를 통째로 내려보냈습니다 —
 * 1년 쓴 매장이면 한 번에 471KB 였고, 바뀐 게 없어도 그랬습니다.
 */
app.get("/api/stores/:code/versions", async (req, res) => {
  const code = req.params.code.toUpperCase();

  try {
    const store = await getStore(code);
    if (!store) {
      res.status(404).json({ error: "그런 매장 코드가 없습니다." });
      return;
    }

    res.json({ versions: await readVersions(code) });
  } catch (error) {
    console.error("[api] 판 번호 읽기 실패", error);
    res.status(500).json({ error: "자료를 읽지 못했습니다." });
  }
});

/** 매장의 모든 자료를 한 번에 꺼냅니다. 앱이 열릴 때 부릅니다. */
app.get("/api/stores/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();

  try {
    const store = await getStore(code);
    if (!store) {
      res.status(404).json({ error: "그런 매장 코드가 없습니다." });
      return;
    }

    const { data, versions } = await readAll(code);
    res.json({
      ...store,
      data: { ...data, members: hidePins("members", data.members) },
      versions,
    });
  } catch (error) {
    console.error("[api] 매장 읽기 실패", error);
    res.status(500).json({ error: "자료를 읽지 못했습니다." });
  }
});

/** 자료 한 종류만 꺼냅니다. 판 번호가 바뀐 것만 받아 갈 때 씁니다. */
app.get("/api/stores/:code/:key", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const key = req.params.key;

  if (!isDataKey(key)) {
    res.status(400).json({ error: "그런 자료 종류가 없습니다." });
    return;
  }

  try {
    const store = await getStore(code);
    if (!store) {
      res.status(404).json({ error: "그런 매장 코드가 없습니다." });
      return;
    }

    const { items, version } = await readData(code, key);
    res.json({ items: hidePins(key, items), version });
  } catch (error) {
    console.error("[api] 자료 읽기 실패", error);
    res.status(500).json({ error: "자료를 읽지 못했습니다." });
  }
});

/**
 * 자료 한 종류를 통째로 담습니다. (근무·직원·교대·근무일지)
 *
 * baseVersion 을 함께 보내면 "그 사이에 남이 고쳤나"를 확인합니다.
 * 고쳤으면 409 와 함께 지금 자료를 돌려줍니다 — 앱이 다시 얹어서 보냅니다.
 */
app.put("/api/stores/:code/:key", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const key = req.params.key;

  if (!isDataKey(key)) {
    res.status(400).json({ error: "그런 자료 종류가 없습니다." });
    return;
  }

  const items = req.body?.items;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: "자료는 묶음이어야 합니다." });
    return;
  }

  const raw = req.body?.baseVersion;
  const baseVersion = typeof raw === "number" ? raw : undefined;

  try {
    const store = await getStore(code);
    if (!store) {
      res.status(404).json({ error: "그런 매장 코드가 없습니다." });
      return;
    }

    const toSave = key === "members" ? await keepPins(code, items) : items;
    const result = await writeData(code, key, toSave, baseVersion);

    if (!result.ok) {
      res.status(409).json({
        error: "그 사이에 다른 사람이 고쳤습니다.",
        items: hidePins(key, result.items),
        version: result.version,
      });
      return;
    }

    res.json({ ok: true, version: result.version });
  } catch (error) {
    console.error("[api] 자료 담기 실패", error);
    res.status(500).json({ error: "자료를 담지 못했습니다." });
  }
});

/** 서버가 살아 있는지 확인하는 곳 (배포한 곳에서 씁니다) */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: hasDatabase });
});

// ───────────────────────── 앱 화면 ─────────────────────────

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * 화면 파일이 있는 곳.
 *   빌드한 뒤(dist/server.js)     → 옆의 public/
 *   소스로 바로 돌릴 때(tsx watch) → dist/public (먼저 pnpm build 를 한 번 해 둔다)
 * 둘 다 없으면 API 만 돌아갑니다. pnpm dev(vite)가 화면을 맡고 /api 만 여기로 넘깁니다.
 */
const publicDir =
  [path.resolve(here, "public"), path.resolve(here, "..", "dist", "public")].find((dir) =>
    existsSync(path.join(dir, "index.html"))
  ) ?? path.resolve(here, "public");

app.use(express.static(publicDir));

/**
 * 위에서 걸리지 않은 주소는 전부 앱 화면으로 보냅니다.
 * 주소창에 /schedule 을 직접 쳐도 앱이 열리게 하기 위해서입니다.
 * (/api 로 시작하는 것은 위에서 이미 처리됐습니다)
 */
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ───────────────────────── 서버 켜기 ─────────────────────────

const port = Number(process.env.PORT ?? 3000);

initStore()
  .then(() => {
    app.listen(port, () => {
      console.log(`WorkMate 서버가 http://localhost:${port} 에서 돌고 있습니다`);
      if (!hasDatabase) {
        console.log("자료 창고가 없어 서버를 끄면 자료가 사라집니다");
      }
    });
  })
  .catch((error) => {
    console.error("서버를 켜지 못했습니다", error);
    process.exit(1);
  });
