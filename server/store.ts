import { Pool } from "pg";

/**
 * 매장 자료를 담아 두는 곳입니다.
 *
 * 자료 창고(Postgres)가 연결돼 있으면 거기에 담고,
 * 없으면 서버가 켜져 있는 동안만 기억합니다(개발용).
 *
 * 담는 모양은 아주 단순합니다.
 *
 *   stores      매장 하나 (코드, 이름)
 *   store_data  매장의 자료 묶음 (근무·직원·교대·근무일지)
 *
 * 자료를 종류별로 통째로 담습니다. 근무 한 건씩 표에 넣지 않습니다.
 * 작은 매장 규모(직원 열 명 남짓)에서는 이 편이 단순하고 빠릅니다.
 */

/** 앱이 다루는 자료 종류 */
export const DATA_KEYS = ["shifts", "members", "swaps", "logs", "notices"] as const;
export type DataKey = (typeof DATA_KEYS)[number];

export function isDataKey(value: string): value is DataKey {
  return (DATA_KEYS as readonly string[]).includes(value);
}

// ───────────────────────── 창고 연결 ─────────────────────────

const connectionString = process.env.DATABASE_URL;

/**
 * ssl 설정을 붙이는 이유:
 *   Neon·Render 같은 곳의 창고는 암호화 연결만 받습니다.
 *   rejectUnauthorized: false 는 그쪽이 주는 인증서를 그대로 받아들이라는 뜻입니다.
 *   (창고 주소를 아는 사람만 접속할 수 있으므로 이 정도로 씁니다)
 */
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    })
  : null;

export const hasDatabase = Boolean(pool);

/** 창고에 표가 없으면 만듭니다. 서버가 켜질 때 한 번 부릅니다. */
export async function initStore() {
  if (!pool) {
    console.log("[store] DATABASE_URL 이 없어 메모리에만 담습니다 (개발용)");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stores (
      code       TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_data (
      code       TEXT NOT NULL REFERENCES stores(code) ON DELETE CASCADE,
      key        TEXT NOT NULL,
      items      JSONB NOT NULL DEFAULT '[]'::jsonb,
      version    INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (code, key)
    );
  `);

  // 이미 만들어진 창고에도 version 칸을 붙입니다 (전에 만든 매장이 있으니까).
  await pool.query(
    `ALTER TABLE store_data ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`
  );

  console.log("[store] 자료 창고를 준비했습니다");
}

// ─────────────────── 창고가 없을 때 쓰는 자리 ───────────────────

const memoryStores = new Map<string, { name: string }>();
const memoryData = new Map<string, { items: unknown[]; version: number }>();

const memoryKey = (code: string, key: DataKey) => `${code}:${key}`;

// ───────────────────────── 매장 ─────────────────────────

/**
 * 매장 코드를 만듭니다. 여섯 글자.
 *
 * 헷갈리는 글자(0/O, 1/I/L)는 뺐습니다.
 * 사장님이 카톡으로 알려 주거나 받아 적을 일이 있어서입니다.
 */
function makeCode() {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
}

export async function createStore(name: string) {
  // 아주 드물게 코드가 겹칠 수 있으니 몇 번 다시 뽑아 봅니다.
  for (let tries = 0; tries < 10; tries += 1) {
    const code = makeCode();

    if (!pool) {
      if (memoryStores.has(code)) continue;
      memoryStores.set(code, { name });
      return code;
    }

    const result = await pool.query(
      "INSERT INTO stores (code, name) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING code",
      [code, name]
    );
    if (result.rowCount) return code;
  }

  throw new Error("매장 코드를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

export async function getStore(code: string) {
  if (!pool) {
    const found = memoryStores.get(code);
    return found ? { code, name: found.name } : null;
  }

  const result = await pool.query("SELECT code, name FROM stores WHERE code = $1", [
    code,
  ]);
  return result.rows[0] ?? null;
}

// ───────────────────────── 자료 ─────────────────────────

/**
 * 자료 하나를 읽습니다. 몇 번째 판(version)인지 함께 돌려줍니다.
 *
 * 판 번호를 쓰는 이유는 두 가지입니다.
 *   ① 바뀐 게 없으면 다시 안 내려보내려고 (양을 줄인다)
 *   ② 남이 먼저 고친 걸 덮어쓰지 않으려고 (사고를 막는다)
 */
export async function readData(
  code: string,
  key: DataKey
): Promise<{ items: unknown[]; version: number }> {
  if (!pool) return memoryData.get(memoryKey(code, key)) ?? { items: [], version: 0 };

  const result = await pool.query(
    "SELECT items, version FROM store_data WHERE code = $1 AND key = $2",
    [code, key]
  );
  const row = result.rows[0];
  return { items: row?.items ?? [], version: row?.version ?? 0 };
}

/** 지금 판 번호만 봅니다. 자료는 안 읽습니다 — 이게 가벼워야 자주 물어볼 수 있습니다. */
export async function readVersions(code: string): Promise<Record<DataKey, number>> {
  const empty = Object.fromEntries(DATA_KEYS.map((key) => [key, 0])) as Record<
    DataKey,
    number
  >;

  if (!pool) {
    for (const key of DATA_KEYS) {
      empty[key] = memoryData.get(memoryKey(code, key))?.version ?? 0;
    }
    return empty;
  }

  const result = await pool.query(
    "SELECT key, version FROM store_data WHERE code = $1",
    [code]
  );
  for (const row of result.rows) {
    const key = String(row.key);
    if (isDataKey(key)) empty[key] = Number(row.version);
  }
  return empty;
}

/**
 * 자료를 덮어씁니다.
 *
 * baseVersion — "내가 보고 있던 판"입니다.
 *   그 사이에 남이 고쳤으면 판 번호가 올라가 있으므로 거절합니다.
 *   거절할 때는 지금 자료를 함께 돌려줘서, 부르는 쪽이 다시 얹을 수 있게 합니다.
 *
 *   이게 없으면 이런 일이 납니다 —
 *   사장님과 알바생이 8초 안에 각자 근무를 넣으면
 *   나중에 저장한 사람이 먼저 저장한 사람을 통째로 지웁니다. 오류도 안 뜹니다.
 *
 * baseVersion 을 안 주면(undefined) 검사 없이 덮어씁니다.
 */
export async function writeData(
  code: string,
  key: DataKey,
  items: unknown[],
  baseVersion?: number
): Promise<
  { ok: true; version: number } | { ok: false; items: unknown[]; version: number }
> {
  if (!pool) {
    const now = memoryData.get(memoryKey(code, key)) ?? { items: [], version: 0 };
    if (baseVersion !== undefined && baseVersion !== now.version) {
      return { ok: false, items: now.items, version: now.version };
    }
    const next = { items, version: now.version + 1 };
    memoryData.set(memoryKey(code, key), next);
    return { ok: true, version: next.version };
  }

  // 판 번호를 안 따질 때는 그냥 덮어씁니다.
  if (baseVersion === undefined) {
    const result = await pool.query(
      `INSERT INTO store_data (code, key, items, version, updated_at)
       VALUES ($1, $2, $3::jsonb, 1, now())
       ON CONFLICT (code, key)
       DO UPDATE SET items = EXCLUDED.items,
                     version = store_data.version + 1,
                     updated_at = now()
       RETURNING version`,
      [code, key, JSON.stringify(items)]
    );
    return { ok: true, version: result.rows[0].version };
  }

  // 판 번호가 맞을 때만 씁니다. 한 문장 안에서 확인과 쓰기가 같이 일어나므로
  // 그 사이에 남이 끼어들 틈이 없습니다.
  const result = await pool.query(
    `INSERT INTO store_data (code, key, items, version, updated_at)
     VALUES ($1, $2, $3::jsonb, 1, now())
     ON CONFLICT (code, key)
     DO UPDATE SET items = EXCLUDED.items,
                   version = store_data.version + 1,
                   updated_at = now()
     WHERE store_data.version = $4
     RETURNING version`,
    [code, key, JSON.stringify(items), baseVersion]
  );

  if (result.rowCount) return { ok: true, version: result.rows[0].version };

  // 못 썼습니다 — 그 사이에 남이 고쳤습니다.
  const current = await readData(code, key);
  return { ok: false, items: current.items, version: current.version };
}

/** 매장의 모든 자료를 한 번에 읽습니다. 앱이 열릴 때 씁니다. */
export async function readAll(code: string) {
  const entries = await Promise.all(
    DATA_KEYS.map(async (key) => [key, await readData(code, key)] as const)
  );

  const data = {} as Record<DataKey, unknown[]>;
  const versions = {} as Record<DataKey, number>;
  for (const [key, value] of entries) {
    data[key] = value.items;
    versions[key] = value.version;
  }
  return { data, versions };
}
