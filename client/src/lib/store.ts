import type { DataKey } from "@/types";

/**
 * 서버에 있는 "우리 매장"과 이야기하는 곳입니다.
 *
 * 매장마다 여섯 글자 코드가 있습니다(예: XQ74VU).
 * 그 코드를 아는 사람이 같은 근무표를 봅니다.
 *
 * 코드는 두 곳에서 옵니다.
 *   ① 초대 링크  …/?store=XQ74VU  ← 사장님이 카톡으로 보낸 것
 *   ② 이 기기에 저장해 둔 것       ← 한 번 들어왔으면 남아 있습니다
 */

const STORE_CODE_KEY = "workmate-store-code";

/** localStorage 는 브라우저 설정에 따라 막힐 수 있어 try 로 감쌉니다. */
function readSaved() {
  try {
    return localStorage.getItem(STORE_CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function save(code: string) {
  try {
    if (code) localStorage.setItem(STORE_CODE_KEY, code);
    else localStorage.removeItem(STORE_CODE_KEY);
  } catch {}
}

/**
 * 지금 보고 있는 매장 코드.
 *
 * 초대 링크로 들어왔으면 주소에서 코드를 꺼내 저장하고,
 * 주소는 깨끗하게 정리합니다(코드가 주소창에 계속 남지 않게).
 */
export function currentStoreCode() {
  const fromLink = new URLSearchParams(window.location.search).get("store");

  if (fromLink) {
    const code = fromLink.trim().toUpperCase();
    save(code);
    window.history.replaceState(
      {},
      "",
      window.location.pathname + window.location.hash
    );
    return code;
  }

  return readSaved();
}

export function setStoreCode(code: string) {
  save(code.trim().toUpperCase());
}

export function clearStoreCode() {
  save("");
}

/** 초대 링크를 만듭니다. 카톡으로 이 주소를 보내면 됩니다. */
export function inviteLink(code: string) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?store=${code}`;
}

// ───────────────────────── 서버와 이야기 ─────────────────────────

type StoreResponse = {
  code: string;
  name: string;
  data: Record<DataKey, unknown[]>;
};

async function ask(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "서버와 이야기하지 못했습니다.");
  }

  return response.json();
}

/** 서버가 살아 있고 자료 창고가 붙어 있는지 봅니다. */
export async function checkServer(): Promise<{ ok: boolean; database: boolean }> {
  try {
    return await ask("/api/health");
  } catch {
    return { ok: false, database: false };
  }
}

/** 새 매장을 엽니다. 매장 코드를 돌려줍니다. */
export async function createStore(name: string): Promise<string> {
  const result = await ask("/api/stores", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  setStoreCode(result.code);
  return result.code;
}

/** 매장 자료를 통째로 꺼냅니다. 없는 코드면 null */
export async function fetchStore(code: string): Promise<StoreResponse | null> {
  try {
    return await ask(`/api/stores/${code}`);
  } catch {
    return null;
  }
}

/** 자료 한 종류를 통째로 담습니다. */
export async function saveData(code: string, key: DataKey, items: unknown[]) {
  await ask(`/api/stores/${code}/${key}`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}
