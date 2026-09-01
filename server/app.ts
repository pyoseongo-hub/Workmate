import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStore,
  getStore,
  hasDatabase,
  initStore,
  isDataKey,
  readAll,
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
 *   개인 번호(PIN)는 자료 안에 담겨 있어, 코드를 알면 볼 수 있습니다.
 *   작은 매장에서 서로 아는 사람끼리 쓰는 것을 전제로 한 수준입니다.
 *   (다음 단계에서 번호 확인을 서버로 옮기고 자료에서 빼는 것이 좋습니다)
 */

const app = express();
app.use(express.json({ limit: "2mb" }));

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

/** 매장의 모든 자료를 한 번에 꺼냅니다. 앱이 열릴 때 부릅니다. */
app.get("/api/stores/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();

  try {
    const store = await getStore(code);
    if (!store) {
      res.status(404).json({ error: "그런 매장 코드가 없습니다." });
      return;
    }

    res.json({ ...store, data: await readAll(code) });
  } catch (error) {
    console.error("[api] 매장 읽기 실패", error);
    res.status(500).json({ error: "자료를 읽지 못했습니다." });
  }
});

/** 자료 한 종류를 통째로 담습니다. (근무·직원·교대·근무일지) */
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

  try {
    const store = await getStore(code);
    if (!store) {
      res.status(404).json({ error: "그런 매장 코드가 없습니다." });
      return;
    }

    await writeData(code, key, items);
    res.json({ ok: true });
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
const publicDir = path.resolve(here, "public");

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
