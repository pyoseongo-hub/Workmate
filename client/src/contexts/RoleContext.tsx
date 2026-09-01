import { createContext, useContext, useState, type ReactNode } from "react";
import { useSharedState } from "@/hooks/useSharedState";
import { STORAGE_KEYS, type Member } from "@/types";

/**
 * 지금 이 기기를 쓰는 사람이 누구인지 앱 전체에서 함께 쓰는 저장소입니다.
 *
 * 들어오는 방법:
 *   이름을 고르고 자기 4자리 번호를 넣습니다.
 *   번호가 맞으면 그 사람으로 들어오고, 사장님이면 사장님 화면이 됩니다.
 *
 * 예전에는 "이름 고르기" 와 "사장님 비밀번호" 가 따로 놀았습니다.
 * 이제 한 번에 정해집니다.
 *
 * ⚠️ 번호 확인은 이 브라우저 안에서 합니다.
 *    "남의 이름으로 잘못 들어가는 것" 을 막는 정도이지,
 *    작정하고 뚫으려는 사람을 막지는 못합니다.
 *    (서버를 붙이면 번호 확인을 서버로 옮길 예정입니다)
 */

type RoleValue = {
  /** 매장 직원 목록 (로그인 화면과 여러 화면이 함께 씁니다) */
  members: Member[];
  /** 지금 들어와 있는 사람. 아직 안 들어왔으면 null */
  me: Member | null;
  /** 들어와 있는 사람 이름. 없으면 빈 글자 */
  myName: string;
  /** 이 사람이 사장님인가 (직원 목록 기준) */
  isOwner: boolean;
  /** 지금 사장님 화면으로 보고 있는가 */
  isOwnerMode: boolean;
  /** 사장님이 알바생 화면을 둘러보는 중인가 */
  viewAsStaff: boolean;

  /** 이름과 번호로 들어옵니다. 맞으면 true */
  login: (name: string, pin: string) => boolean;
  /** 맨 처음 매장을 만듭니다. 사장님을 만들고 바로 들어옵니다 */
  setupOwner: (name: string, pin: string) => void;
  /** 나갑니다 */
  logout: () => void;
  /** 사장님이 알바생 화면으로 보기를 켜고 끕니다 */
  toggleViewAsStaff: () => void;
  /** 직원 목록을 고칩니다 (직원 관리 화면에서 씁니다) */
  setMembers: (next: Member[]) => void;
};

const RoleContext = createContext<RoleValue | null>(null);

/**
 * 들어와 있는 사람 이름을 이 기기에 담아 두는 열쇠입니다.
 * 앱을 껐다 켜도 남아 있어야 매번 번호를 넣지 않습니다.
 */
const MY_NAME_KEY = "workmate-my-name";

/** localStorage 는 브라우저 설정에 따라 막힐 수 있어 try 로 감쌉니다. */
function readSavedName() {
  try {
    return localStorage.getItem(MY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useSharedState<Member[]>(STORAGE_KEYS.members, []);
  const [myName, setMyName] = useState(readSavedName);
  const [viewAsStaff, setViewAsStaff] = useState(false);

  // 사장님인지는 저장해 두지 않고 직원 목록에서 그때그때 봅니다.
  // 저장해 두면 그 값만 고쳐서 사장님 행세를 할 수 있습니다.
  const me = members.find((member) => member.name === myName) ?? null;
  const isOwner = me?.role === "owner";
  const isOwnerMode = isOwner && !viewAsStaff;

  const login = (name: string, pin: string) => {
    const found = members.find((member) => member.name === name);
    if (!found || found.pin !== pin) return false;

    setMyName(name);
    setViewAsStaff(false);
    try {
      localStorage.setItem(MY_NAME_KEY, name);
    } catch {}
    return true;
  };

  /**
   * 맨 처음 매장을 만들 때.
   *
   * 직원 목록을 만드는 것과 들어오는 것을 한 번에 합니다.
   * 따로 하면 목록이 아직 반영되지 않은 사이에 login 이 실패해
   * 매장을 만들자마자 다시 "누구세요?" 화면이 뜹니다.
   */
  const setupOwner = (name: string, pin: string) => {
    setMembers([{ id: 1, name, role: "owner", pin }]);
    setMyName(name);
    setViewAsStaff(false);
    try {
      localStorage.setItem(MY_NAME_KEY, name);
    } catch {}
  };

  const logout = () => {
    setMyName("");
    setViewAsStaff(false);
    try {
      localStorage.removeItem(MY_NAME_KEY);
    } catch {}
  };

  const toggleViewAsStaff = () => setViewAsStaff(!viewAsStaff);

  return (
    <RoleContext.Provider
      value={{
        members,
        me,
        myName,
        isOwner,
        isOwnerMode,
        viewAsStaff,
        login,
        setupOwner,
        logout,
        toggleViewAsStaff,
        setMembers,
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
