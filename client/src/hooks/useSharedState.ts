import { useCallback, useEffect, useRef, useState } from "react";
import { currentStoreCode, fetchStore, saveData } from "@/lib/store";
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
 *   const [shifts, setShifts, isShared] = useSharedState("shifts", []);
 */

/** 서버 자료를 몇 초마다 다시 확인할지 */
const REFRESH_MS = 8000;

/** 함께 보는 저장소에서 문서 하나를 다루는 데 필요한 만큼만 적어 둔 모양 */
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

export function useSharedState<T>(key: DataKey, initialValue: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, initialValue));
  const [isShared, setIsShared] = useState(false);

  /** 지금 쓰고 있는 방식 */
  const modeRef = useRef<"local" | "server" | "artifact">("local");
  const docRef = useRef<SharedDoc | null>(null);
  const storeCodeRef = useRef("");

  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;

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

          // 서버는 바뀐 걸 알려 주지 않으므로 가끔 다시 확인합니다.
          timer = setInterval(async () => {
            const fresh = await fetchStore(code);
            const next = fresh?.data[key];
            if (!stopped && Array.isArray(next)) setValue(next as T);
          }, REFRESH_MS);
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
      if (timer) clearInterval(timer);
    };
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next); // 화면은 먼저 바꿔 둡니다 (기다리지 않게)

      if (modeRef.current === "server") {
        saveData(storeCodeRef.current, key, next as unknown as unknown[]).catch(
          (error) => console.error("[저장 실패]", error)
        );
        return;
      }

      if (modeRef.current === "artifact" && docRef.current) {
        // 함께 보는 저장소는 맨 바깥이 반드시 "묶음"이어야 해서 items 로 감쌉니다.
        docRef.current.set({ items: next as unknown as unknown[] }).catch(() => {});
        return;
      }

      writeLocal(key, next);
    },
    [key]
  );

  return [value, update, isShared] as const;
}
