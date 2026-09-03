import { useCallback, useEffect, useRef, useState } from "react";
import {
  currentStoreCode,
  fetchOne,
  fetchStore,
  fetchVersions,
  saveData,
} from "@/lib/store";
import { storageKey, type DataKey } from "@/types";

/**
 * 여러 사람이 같이 보는 저장소입니다.
 *
 * 세 가지 방식을 자동으로 고릅니다. 위에서부터 되는 것을 씁니다.
 *
 *   ① 매장 코드가 있으면 → 서버.
 *      사장님이 근무표를 고치면 알바생 폰에도 반영됩니다.
 *      기기를 바꿔도 자료가 남습니다.
 *
 *   ② 미리보기 화면이면  → 함께 보는 저장소(claude.ai).
 *      링크를 받은 사람끼리 같은 자료를 봅니다.
 *
 *   ③ 그 밖의 경우      → 이 브라우저 안에만.
 *
 * 쓰는 쪽은 useState 와 똑같습니다:
 *
 *   const [shifts, setShifts] = useSharedState("shifts", []);
 *   setShifts([...shifts, 새것]);                 // 값으로 주거나
 *   setShifts((prev) => [...prev, 새것]);         // 함수로 주거나
 *
 * ⚠️ 남과 같이 고치는 자료는 **함수로 주세요.**
 *    값으로 주면 "내가 보던 목록"이 통째로 올라가서,
 *    그 사이에 남이 넣은 것을 지웁니다.
 *    함수로 주면 부딪혔을 때 서버의 최신 목록에 다시 얹어서 보냅니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 📉 2026-09-03 에 크게 손봤습니다. 그 전에는 이랬습니다:
 *
 *   · 화면 하나가 서버를 8초마다 **6번 따로** 물었다 (자료 종류마다 각자)
 *   · 물을 때마다 매장 자료를 **통째로** 내려받았다 (바뀐 게 없어도)
 *   · 화면을 안 보고 있어도 계속 물었다
 *
 *   재 보니 켜 두기만 한 탭 하나가 1분에 43번을 불렀고,
 *   1년 쓴 매장은 한 번에 471KB 였다. 100명이면 서버가 못 버틴다.
 *
 * 지금은:
 *   · 앱 전체가 **하나의 시계**로 8초마다 한 번만 묻는다
 *   · 묻는 것은 **판 번호뿐** (몇 십 바이트). 바뀐 종류만 따로 받아 온다
 *   · 화면을 안 보고 있으면 **멈춘다**. 돌아오면 바로 한 번 확인한다
 */

/** 서버 자료를 몇 초마다 다시 확인할지 */
const REFRESH_MS = 8000;

// ══════════════════════════════════════════════════════════════
//  서버용 — 앱 전체가 나눠 쓰는 시계 하나
// ══════════════════════════════════════════════════════════════

type Listener = (items: unknown[], version: number) => void;

/** 자료 종류마다 "지금 보고 있는 화면들"을 모아 둡니다 */
const listeners = new Map<DataKey, Set<Listener>>();

/** 자료 종류마다 마지막으로 받은 판 번호 */
const versions = new Map<DataKey, number>();

let pollTimer: ReturnType<typeof setInterval> | undefined;
let pollingCode = "";
/** 확인이 겹치지 않게 (느린 응답이 밀릴 때) */
let checking = false;

/**
 * 같은 자료를 보고 있는 화면들에 새 내용을 알립니다.
 *
 * 서버에서 받아 왔을 때도, 내가 저장했을 때도 부릅니다.
 *
 * ⚠️ 내가 저장했을 때도 부르는 이유 (2026-09-03 에 여기서 한 번 당했습니다):
 *   한 화면 안에서 같은 자료를 두 군데가 볼 수 있습니다.
 *   예를 들어 알림은 머리말의 종과 알림 목록이 각자 보고 있습니다.
 *   알림 목록에서 "읽음" 으로 바꿔도 종은 자기 것만 보고 있어서 안 바뀝니다.
 *
 *   전에는 8초 뒤 확인 때 서버 것을 받아 오면서 저절로 맞춰졌습니다.
 *   지금은 "판 번호가 그대로면 안 받아 오므로" 영영 안 맞춰집니다.
 *   그래서 저장한 쪽이 직접 알려 줍니다. 덤으로 8초를 기다리지 않아도 됩니다.
 */
function notifyListeners(key: DataKey, items: unknown[], version: number) {
  versions.set(key, version);
  listeners.get(key)?.forEach((listen) => listen(items, version));
}

/**
 * 한 바퀴 확인합니다.
 *
 * 판 번호만 받아 보고, 달라진 종류만 따로 가져옵니다.
 * 아무것도 안 바뀌었으면 여기서 끝납니다 — 자료는 한 바이트도 안 내려옵니다.
 */
async function checkOnce(code: string) {
  if (checking) return;
  checking = true;

  try {
    const fresh = await fetchVersions(code);
    if (!fresh) return;

    const changed = (Object.keys(fresh) as DataKey[]).filter(
      (key) => listeners.get(key)?.size && fresh[key] !== versions.get(key)
    );
    if (changed.length === 0) return;

    await Promise.all(
      changed.map(async (key) => {
        const one = await fetchOne(code, key);
        if (one) notifyListeners(key, one.items, one.version);
      })
    );
  } finally {
    checking = false;
  }
}

/** 화면을 보고 있을 때만 시계를 돌립니다 */
function syncTimer() {
  const shouldRun =
    pollingCode !== "" &&
    listeners.size > 0 &&
    typeof document !== "undefined" &&
    document.visibilityState === "visible";

  if (shouldRun && !pollTimer) {
    pollTimer = setInterval(() => void checkOnce(pollingCode), REFRESH_MS);
  } else if (!shouldRun && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    // 화면으로 돌아오면 8초를 기다리지 않고 바로 한 번 봅니다.
    if (document.visibilityState === "visible" && pollingCode) {
      void checkOnce(pollingCode);
    }
    syncTimer();
  });
}

function subscribe(code: string, key: DataKey, listen: Listener) {
  pollingCode = code;

  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listen);
  listeners.set(key, set);
  syncTimer();

  return () => {
    set.delete(listen);
    if (set.size === 0) listeners.delete(key);
    syncTimer();
  };
}

// ══════════════════════════════════════════════════════════════
//  미리보기 화면용 — claude.ai 의 함께 보는 저장소
// ══════════════════════════════════════════════════════════════

type SharedDoc = {
  set(data: Record<string, unknown>): Promise<void>;
  onSnapshot(
    next: (snap: { exists: boolean; data(): Record<string, unknown> | undefined }) => void,
    error?: (error: { code: string; message: string }) => void
  ): () => void;
};

type SharedDb = { doc(path: string): SharedDoc };

declare global {
  interface Window {
    claude?: { use?: (name: string) => Promise<unknown> };
  }
}

async function findSharedDb(): Promise<SharedDb | null> {
  for (let tries = 0; tries < 30; tries += 1) {
    if (typeof window.claude?.use === "function") {
      try {
        return ((await window.claude.use("db")) as SharedDb | null) ?? null;
      } catch {
        return null;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

/**
 * 찾는 일은 앱 전체에서 한 번만 합니다.
 * 화면마다 각자 3초씩 찾아 나서면 같은 일을 예닐곱 번 되풀이하게 됩니다.
 */
let sharedDbPromise: Promise<SharedDb | null> | null = null;

function getSharedDb() {
  if (!sharedDbPromise) sharedDbPromise = findSharedDb();
  return sharedDbPromise;
}

// ══════════════════════════════════════════════════════════════
//  이 브라우저 안에만
// ══════════════════════════════════════════════════════════════

function readLocal<T>(key: DataKey, fallback: T): T {
  try {
    const saved = localStorage.getItem(storageKey(key));
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: DataKey, value: T) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {}
}

// ══════════════════════════════════════════════════════════════

/** 값으로도, 함수로도 줄 수 있습니다 (useState 와 같게) */
type Update<T> = T | ((prev: T) => T);

function resolve<T>(next: Update<T>, prev: T): T {
  return typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
}

/** 부딪혔을 때 다시 얹어 보는 횟수 */
const RETRIES = 4;

export function useSharedState<T>(key: DataKey, initialValue: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, initialValue));
  const [isShared, setIsShared] = useState(false);

  /** 지금 쓰고 있는 방식 */
  const modeRef = useRef<"local" | "server" | "artifact">("local");
  const docRef = useRef<SharedDoc | null>(null);
  const storeCodeRef = useRef("");
  /** 저장할 때 서버에 보낼 "내가 보던 판 번호" */
  const versionRef = useRef(0);
  /** 함수 안에서 최신 값을 보려고 (state 는 한 박자 늦습니다) */
  const valueRef = useRef<T>(value);
  valueRef.current = value;

  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      // ── ① 서버 ──────────────────────────────────
      const code = currentStoreCode();
      if (code) {
        const store = await fetchStore(code);
        if (stopped) return;

        if (store) {
          modeRef.current = "server";
          storeCodeRef.current = code;
          setIsShared(true);

          const items = store.data[key];
          if (Array.isArray(items)) setValue(items as T);

          const version = store.versions?.[key] ?? 0;
          versionRef.current = version;
          versions.set(key, version);

          // 앱 전체가 나눠 쓰는 시계에 이름을 올립니다.
          unsubscribe = subscribe(code, key, (fresh, freshVersion) => {
            if (stopped) return;
            versionRef.current = freshVersion;
            setValue(fresh as T);
          });
          return;
        }
      }

      // ── ② 미리보기 화면의 함께 보는 저장소 ────────
      const db = await getSharedDb();
      if (!db || stopped) return;

      modeRef.current = "artifact";
      const doc = db.doc(`shared/${storageKey(key)}`);
      docRef.current = doc;
      setIsShared(true);

      unsubscribe = doc.onSnapshot((snap) => {
        if (!snap.exists) return;
        const body = snap.data();
        if (body && Array.isArray(body.items)) setValue(body.items as T);
      });
    })();

    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, [key]);

  const update = useCallback(
    (next: Update<T>) => {
      const computed = resolve(next, valueRef.current);
      setValue(computed); // 화면은 먼저 바꿔 둡니다 (기다리지 않게)

      if (modeRef.current === "server") {
        void (async () => {
          let toSave = computed;

          for (let tries = 0; tries < RETRIES; tries += 1) {
            const result = await saveData(
              storeCodeRef.current,
              key,
              toSave as unknown as unknown[],
              versionRef.current
            ).catch((error) => {
              console.error("[저장 실패]", error);
              return null;
            });

            if (!result) return;

            if (result.ok) {
              versionRef.current = result.version;
              // 같은 자료를 보고 있는 다른 화면에도 알려 줍니다.
              notifyListeners(key, toSave as unknown as unknown[], result.version);
              return;
            }

            // 그 사이에 남이 고쳤습니다.
            versionRef.current = result.version;

            if (typeof next !== "function") {
              // 값으로 받았으면 다시 얹을 방법이 없습니다.
              // 남의 것을 지우느니 내 것을 포기합니다.
              console.warn(`[${key}] 다른 사람이 먼저 고쳐서 서버 것을 따릅니다.`);
              setValue(result.items as T);
              return;
            }

            // 함수로 받았으면 서버의 최신 목록에 다시 얹어 봅니다.
            toSave = (next as (prev: T) => T)(result.items as T);
            setValue(toSave);
          }

          console.warn(`[${key}] 여러 번 부딪혀 저장을 멈췄습니다.`);
        })();
        return;
      }

      if (modeRef.current === "artifact" && docRef.current) {
        // 함께 보는 저장소는 맨 바깥이 반드시 "묶음"이어야 해서 items 로 감쌉니다.
        docRef.current.set({ items: computed as unknown as unknown[] }).catch(() => {});
        return;
      }

      writeLocal(key, computed);
    },
    [key]
  );

  return [value, update, isShared] as const;
}
