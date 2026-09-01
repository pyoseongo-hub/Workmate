import { useSharedState } from "@/hooks/useSharedState";
import { useNotices } from "@/hooks/useNotices";
import { type SwapRow, type SwapStatus } from "@/types";

/**
 * 교대 요청을 읽고 고치는 곳을 한 군데로 모았습니다.
 *
 * 근무표 화면과 교대 관리 화면이 이 훅을 함께 씁니다.
 * 같은 저장소를 보므로, 한쪽에서 신청하면 다른 쪽에도 바로 나타납니다.
 */
export function useSwaps() {
  const [swaps, setSwaps, isShared] = useSharedState<SwapRow[]>("swaps", []);
  const { notify } = useNotices();

  /** 새 교대를 신청합니다. 처음 상태는 "상대 확인 대기" 입니다. */
  const addSwap = (form: Omit<SwapRow, "id" | "status">) => {
    const nextId = Math.max(0, ...swaps.map((swap) => swap.id)) + 1;
    setSwaps([{ ...form, id: nextId, status: "pending_target" }, ...swaps]);
    notify(`${form.workDate} 교대를 신청했어요 (${form.fromName} → ${form.toName})`);
  };

  /** 상태를 바꿉니다. 상대 확인 → 사장님 승인 → 완료 순으로 넘어갑니다. */
  const setStatus = (id: number, status: SwapStatus) => {
    setSwaps(swaps.map((swap) => (swap.id === id ? { ...swap, status } : swap)));

    const target = swaps.find((swap) => swap.id === id);
    if (!target) return;

    const said: Partial<Record<SwapStatus, string>> = {
      pending_owner: "교대 내용을 확인했어요 (사장님 승인 대기)",
      approved: "교대를 승인했어요",
      rejected: "교대를 거절했어요",
    };
    const text = said[status];
    if (text) notify(`${target.workDate} ${text}`);
  };

  /** 교대 요청을 목록에서 아예 없앱니다. 잘못 신청했을 때 씁니다. */
  const removeSwap = (id: number) => {
    const target = swaps.find((swap) => swap.id === id);
    setSwaps(swaps.filter((swap) => swap.id !== id));
    if (target) notify(`${target.workDate} 교대 요청을 취소했어요`);
  };

  /** 아직 처리가 끝나지 않은 요청들 */
  const pending = swaps.filter(
    (swap) => swap.status === "pending_target" || swap.status === "pending_owner"
  );

  return { swaps, pending, addSwap, setStatus, removeSwap, isShared };
}
