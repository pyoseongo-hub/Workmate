/**
 * 앱이 다루는 데이터의 모양을 한곳에 모아 둔 파일입니다.
 *
 * 화면마다 따로 적어 두면 한쪽만 고쳤을 때 어긋나기 쉬워서,
 * 여기 한 군데만 보면 되도록 모았습니다.
 */

/**
 * 앱이 다루는 자료 종류.
 *
 * 서버(server/store.ts)도 같은 이름을 씁니다.
 * 한쪽만 고치면 어긋나므로 이름을 바꿀 때는 두 곳을 함께 봅니다.
 */
export const DATA_KEYS = ["shifts", "members", "swaps", "logs", "notices"] as const;
export type DataKey = (typeof DATA_KEYS)[number];

/** 이 브라우저에 담을 때 쓰는 이름표 (다른 앱과 겹치지 않게 앞에 workmate-) */
export function storageKey(key: DataKey) {
  return `workmate-${key}`;
}

/**
 * 근무 한 건.
 * workDate 에 "2026-09-01" 처럼 연·월·일을 모두 담습니다.
 *
 * ⏱️ 휴게시간 칸을 일부러 두지 않았습니다 (사장님 방침, 2026-09-01).
 *
 *   앱이 하는 일은 "언제부터 언제까지 있었나" 를 적는 것까지입니다.
 *   쉬는 시간을 빼거나, 급여를 셈하거나, 수당을 붙이지 않습니다.
 *   매장마다 셈법이 다르고, 그건 사장님이 판단할 몫입니다.
 *
 *   칸을 만들어 두면 언젠가 누가 채우고, 채우면 계산에 끼어듭니다.
 *   그래서 아예 만들지 않았습니다. 여기에 breakMinutes 를 더하지 마세요.
 */
export type Shift = {
  workDate: string;
  person: string;
  start: string; // "09:00"
  end: string; // "18:00"
};

/**
 * 매장 직원.
 *
 * pin — 이 사람이 앱에 들어올 때 쓰는 4자리 숫자입니다.
 *
 * ⚠️ 지금은 번호가 자료에 그대로 담깁니다.
 *    브라우저 개발자도구를 열 줄 아는 사람은 볼 수 있으니
 *    "남의 이름으로 잘못 들어가는 것"을 막는 정도로 보세요.
 *    은행 비밀번호 같은 수준의 보호가 아닙니다.
 *    (서버를 붙이면 번호 확인을 서버가 맡도록 옮길 예정입니다)
 */
export type Member = {
  id: number;
  name: string;
  role: "owner" | "staff";
  pin: string;
};

/**
 * 교대 요청의 진행 상태.
 *
 *   pending_target → 상대 알바생이 확인하기를 기다리는 중
 *   pending_owner  → 사장님이 승인하기를 기다리는 중
 *   approved       → 승인 완료
 *   rejected       → 거절 또는 반려
 */
export type SwapStatus = "pending_target" | "pending_owner" | "approved" | "rejected";

/** 교대 요청 한 건 */
export type SwapRow = {
  id: number;
  workDate: string;
  start: string;
  end: string;
  fromName: string;
  toName: string;
  reason: string;
  status: SwapStatus;
};

/**
 * 알림 한 건 — "누가 무엇을 고쳤다" 를 남깁니다.
 *
 * 사장님이 매장에 없어도 무슨 일이 있었는지 알 수 있어야 합니다.
 * 자기가 한 일은 남기지 않습니다(자기가 아니까요).
 */
export type Notice = {
  id: number;
  /** 언제 (2026-09-01T14:30 모양) */
  at: string;
  /** 누가 */
  who: string;
  /** 무엇을 했나 */
  text: string;
  /** 이 알림을 읽은 사람들의 이름 */
  readBy: string[];
};

/** 근무일지 한 건 */
export type LogRow = {
  id: number;
  workDate: string;
  planned: string; // 예정 근무 "09:00–18:00"
  clockIn: string; // 실제 출근 "09:03"
  clockOut: string; // 실제 퇴근 "18:02"
  note: string;
};

/**
 * 사람마다 다른 색.
 *
 * 폰 달력 칸은 폭이 50px 남짓이라 이름과 시간을 같이 넣으면 잘립니다.
 * 그래서 달력에는 이름만 넣고, 누구인지는 색으로도 알아보게 합니다.
 * "이번 달 서연이 몇 번 나오나" 를 같은 색만 세면 알 수 있습니다.
 *
 * Tailwind 는 "bg-" + 변수 처럼 이어 붙인 클래스 이름을 알아보지 못하므로
 * 쓸 색을 통째로 적어 둡니다.
 */
export const PERSON_COLORS = [
  { dot: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900" },
  { dot: "bg-violet-500", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900" },
  { dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900" },
  { dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900" },
  { dot: "bg-rose-500", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900" },
  { dot: "bg-cyan-500", bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-900" },
] as const;

/**
 * 그 사람의 색을 고릅니다.
 *
 * 직원 번호(id)로 고르는 이유: 목록 순서로 고르면 앞사람을 지웠을 때
 * 남은 사람들 색이 우르르 바뀝니다. id 는 한 번 정해지면 바뀌지 않습니다.
 */
export function personColor(members: Member[], name: string) {
  const member = members.find((item) => item.name === name);
  return PERSON_COLORS[(member?.id ?? 0) % PERSON_COLORS.length];
}

/** 1 → "01" */
export function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** (2026, 9, 1) → "2026-09-01" */
export function toDateString(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 오늘 날짜를 "2026-09-01" 모양으로 */
export function todayString() {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
