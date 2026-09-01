import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * 사장님 모드 / 알바생 모드를 앱 전체에서 함께 쓰기 위한 저장소입니다.
 *
 * 값이 두 개인 이유를 꼭 기억해 주세요.
 *
 *   isOwnerAccount : 서버가 인정한 "사장님 계정"인가?  (로그인 정보 기준)
 *   isOwnerMode    : 지금 화면을 사장님 모드로 보고 있는가?  (비밀번호 입력 완료)
 *
 * 왜 나누었나:
 *   사장님이라도 평소에는 알바생 화면으로 보다가,
 *   필요할 때만 비밀번호를 넣고 사장님 모드로 바꿀 수 있게 하려고요.
 *
 * ⚠️ 중요 — 지금 비밀번호는 이 파일(=브라우저)에 들어 있습니다.
 *   브라우저 개발자도구를 열면 누구나 볼 수 있으니 "진짜 잠금"이 아닙니다.
 *   화면을 가려주는 역할일 뿐입니다.
 *
 *   진짜 잠금은 서버가 합니다. server/routers.ts 의 ownerOnly 가
 *   사장님 계정이 아니면 승인·직원관리 요청을 거절합니다.
 *   → 나중에 이 비밀번호도 서버로 옮길 예정입니다. (2단계 작업)
 */

const OWNER_PIN = "0000";

type RoleValue = {
  /** 서버 기준 사장님 계정인가 */
  isOwnerAccount: boolean;
  /** 지금 사장님 모드로 보고 있는가 */
  isOwnerMode: boolean;
  /** 비밀번호를 확인하고 사장님 모드로 들어갑니다. 맞으면 true */
  enterOwnerMode: (pin: string) => boolean;
  /** 알바생 모드로 돌아갑니다 */
  exitOwnerMode: () => void;
  /** 이 기기를 쓰는 사람의 이름. 아직 안 골랐으면 빈 글자 */
  myName: string;
  /** 내 이름을 정합니다 */
  setMyName: (name: string) => void;
};

const RoleContext = createContext<RoleValue | null>(null);

/**
 * 사장님 모드를 브라우저 탭에 기억시키는 열쇠 이름입니다.
 *
 * sessionStorage 를 쓰는 이유:
 *   · 새로고침해도 모드가 풀리지 않습니다(매번 비밀번호를 넣지 않아도 됨).
 *   · 탭을 닫으면 자동으로 풀립니다(공용 기기에서 남지 않음).
 */
const OWNER_MODE_KEY = "workmate-owner-mode";

/**
 * 이 기기를 쓰는 사람의 이름을 담아 두는 열쇠입니다.
 *
 * 사장님 모드와 달리 localStorage 를 씁니다.
 *   · 앱을 껐다 켜도 "나는 서연" 이 그대로 남아야 편합니다.
 *   · 근무를 넣을 때마다 이름을 다시 고르지 않아도 됩니다.
 *
 * 이 값은 이 기기에만 남습니다. 다른 사람 폰에는 그 사람 이름이 남습니다.
 */
const MY_NAME_KEY = "workmate-my-name";

/** sessionStorage 는 브라우저 설정에 따라 막힐 수 있어 try 로 감쌉니다. */
function readSavedOwnerMode() {
  try {
    return sessionStorage.getItem(OWNER_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function readSavedMyName() {
  try {
    return localStorage.getItem(MY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOwnerMode, setIsOwnerMode] = useState(readSavedOwnerMode);

  const isOwnerAccount = user?.role === "admin";

  const enterOwnerMode = (pin: string) => {
    if (pin !== OWNER_PIN) return false;
    setIsOwnerMode(true);
    try {
      sessionStorage.setItem(OWNER_MODE_KEY, "1");
    } catch {}
    return true;
  };

  const exitOwnerMode = () => {
    setIsOwnerMode(false);
    try {
      sessionStorage.removeItem(OWNER_MODE_KEY);
    } catch {}
  };

  const [myName, setMyNameState] = useState(readSavedMyName);

  const setMyName = (name: string) => {
    setMyNameState(name);
    try {
      if (name) localStorage.setItem(MY_NAME_KEY, name);
      else localStorage.removeItem(MY_NAME_KEY);
    } catch {}
  };

  return (
    <RoleContext.Provider
      value={{
        isOwnerAccount,
        isOwnerMode,
        enterOwnerMode,
        exitOwnerMode,
        myName,
        setMyName,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

/** 어느 화면에서든 `const { isOwnerMode } = useRole()` 처럼 꺼내 쓰면 됩니다. */
export function useRole() {
  const value = useContext(RoleContext);
  if (!value) {
    throw new Error("useRole은 RoleProvider 안에서만 쓸 수 있습니다.");
  }
  return value;
}
