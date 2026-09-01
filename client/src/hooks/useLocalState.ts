import { useEffect, useState } from "react";

/**
 * useState 와 똑같이 쓰지만, 값이 바뀔 때마다 브라우저에 저장해 둡니다.
 * 새로고침하거나 앱을 다시 열어도 값이 남아 있습니다.
 *
 *   const [members, setMembers] = useLocalState("workmate-members", []);
 *
 * ⚠️ 지금은 "이 브라우저 안에만" 저장됩니다.
 *    사장님 폰에서 넣은 근무표가 알바생 폰에는 보이지 않습니다.
 *    여럿이 같이 보려면 서버에 저장해야 합니다. (다음 단계)
 *
 *    화면 코드는 이미 "저장소에서 읽고 쓰는" 모양이라,
 *    나중에 이 파일만 서버 방식으로 바꾸면 화면은 거의 그대로 둘 수 있습니다.
 */
export function useLocalState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    // localStorage 는 브라우저 설정(시크릿 모드 등)에 따라 막힐 수 있어 try 로 감쌉니다.
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}
