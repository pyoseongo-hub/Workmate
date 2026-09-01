/**
 * 앱이 다루는 데이터의 모양을 한곳에 모아 둔 파일입니다.
 *
 * 화면마다 따로 적어 두면 한쪽만 고쳤을 때 어긋나기 쉬워서,
 * 여기 한 군데만 보면 되도록 모았습니다.
 */

/** 브라우저에 저장할 때 쓰는 이름표. 겹치지 않게 여기서 관리합니다. */
export const STORAGE_KEYS = {
  shifts: "workmate-shifts",
  members: "workmate-members",
  swaps: "workmate-swaps",
  logs: "workmate-logs",
} as const;

/**
 * 근무 한 건.
 * workDate 에 "2026-09-01" 처럼 연·월·일을 모두 담습니다.
 */
export type Shift = {
  workDate: string;
  person: string;
  start: string; // "09:00"
  end: string; // "18:00"
};

/** 매장 직원 */
export type Member = {
  id: number;
  name: string;
  role: "owner" | "staff";
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

/** 근무일지 한 건 */
export type LogRow = {
  id: number;
  workDate: string;
  planned: string; // 예정 근무 "09:00–18:00"
  clockIn: string; // 실제 출근 "09:03"
  clockOut: string; // 실제 퇴근 "18:02"
  note: string;
};

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
