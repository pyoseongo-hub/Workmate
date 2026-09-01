import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 여러 사람이 같이 보는 저장소입니다.
 *
 * 두 가지 방식을 자동으로 골라 씁니다.
 *
 *   ① 초대 링크로 열었을 때 → 모두가 같은 자료를 봅니다.
 *      사장님이 근무표를 고치면 알바생 화면에도 바로 바뀝니다.
 *
 *   ② 그 밖의 경우 → 이 브라우저 안에만 저장합니다. (예전과 같음)
 *
 * 쓰는 쪽은 useState 와 똑같습니다:
 *
 *   const [shifts, setShifts, isShared] = useSharedState("workmate-shifts", []);
 *
 * isShared 가 true 면 "지금 여럿이 같이 보는 중"입니다.
 */

/** 공유 저장소에서 문서 하나를 다루는 데 필요한 만큼만 적어 둔 모양 */
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

/**
 * 공유 저장소가 준비될 때까지 잠깐 기다립니다.
 * 페이지가 뜨자마자 있는 게 아니라 조금 뒤에 생깁니다.
 */
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
  return null; // 3초를 기다려도 없으면 혼자 쓰는 화면입니다
}

/**
 * 찾는 일은 앱 전체에서 한 번만 합니다.
 *
 * 화면마다(근무·직원·교대·근무일지) 이 훅을 쓰는데, 각자 3초씩
 * 찾아 나서면 같은 일을 예닐곱 번 되풀이하게 됩니다.
 * 첫 호출의 결과를 담아 두고 나머지는 그걸 나눠 씁니다.
 */
let sharedDbPromise: Promise<SharedDb | null> | null = null;

function getSharedDb() {
  if (!sharedDbPromise) sharedDbPromise = findSharedDb();
  return sharedDbPromise;
}

/** 브라우저 저장소는 설정에 따라 막힐 수 있어 try 로 감쌉니다. */
function readLocal<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useSharedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, initialValue));
  const [isShared, setIsShared] = useState(false);
  const docRef = useRef<SharedDoc | null>(null);

  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const db = await getSharedDb();
      if (!db || stopped) return;

      // 자료 종류마다 문서 하나를 씁니다. (근무·직원·교대·근무일지)
      const doc = db.doc(`shared/${key}`);
      docRef.current = doc;
      setIsShared(true);

      unsubscribe = doc.onSnapshot((snap) => {
        if (!snap.exists) return;
        const body = snap.data();
        if (body && Array.isArray(body.items)) {
          setValue(body.items as T);
        }
      });
    })();

    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next); // 화면은 먼저 바꿔 둡니다 (기다리지 않게)

      if (docRef.current) {
        // 공유 저장소는 맨 바깥이 반드시 "묶음"이어야 해서 items 로 감쌉니다.
        docRef.current.set({ items: next as unknown as unknown[] }).catch(() => {});
      } else {
        writeLocal(key, next);
      }
    },
    [key]
  );

  return [value, update, isShared] as const;
}
