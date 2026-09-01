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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (code, key)
    );
  `);

  console.log("[store] 자료 창고를 준비했습니다");
}

// ─────────────────── 창고가 없을 때 쓰는 자리 ───────────────────

const memoryStores = new Map<string, { name: string }>();
const memoryData = new Map<string, unknown[]>();

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

export async function readData(code: string, key: DataKey): Promise<unknown[]> {
  if (!pool) return memoryData.get(memoryKey(code, key)) ?? [];

  const result = await pool.query(
    "SELECT items FROM store_data WHERE code = $1 AND key = $2",
    [code, key]
  );
  return result.rows[0]?.items ?? [];
}

export async function writeData(code: string, key: DataKey, items: unknown[]) {
  if (!pool) {
    memoryData.set(memoryKey(code, key), items);
    return;
  }

  // 이미 있으면 덮어씁니다. 자료 종류마다 한 줄만 둡니다.
  await pool.query(
    `INSERT INTO store_data (code, key, items, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (code, key)
     DO UPDATE SET items = EXCLUDED.items, updated_at = now()`,
    [code, key, JSON.stringify(items)]
  );
}

/** 매장의 모든 자료를 한 번에 읽습니다. 앱이 열릴 때 씁니다. */
export async function readAll(code: string) {
  const entries = await Promise.all(
    DATA_KEYS.map(async (key) => [key, await readData(code, key)] as const)
  );
  return Object.fromEntries(entries) as Record<DataKey, unknown[]>;
}
