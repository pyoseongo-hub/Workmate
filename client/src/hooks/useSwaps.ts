import { useLocalState } from "@/hooks/useLocalState";
import { STORAGE_KEYS, type SwapRow, type SwapStatus } from "@/types";

/**
 * 교대 요청을 읽고 고치는 곳을 한 군데로 모았습니다.
 *
 * 근무표 화면과 교대 관리 화면이 이 훅을 함께 씁니다.
 * 같은 저장소를 보므로, 한쪽에서 신청하면 다른 쪽에도 바로 나타납니다.
 */
export function useSwaps() {
  const [swaps, setSwaps] = useLocalState<SwapRow[]>(STORAGE_KEYS.swaps, []);

  /** 새 교대를 신청합니다. 처음 상태는 "상대 확인 대기" 입니다. */
  const addSwap = (form: Omit<SwapRow, "id" | "status">) => {
    const nextId = Math.max(0, ...swaps.map((swap) => swap.id)) + 1;
    setSwaps([{ ...form, id: nextId, status: "pending_target" }, ...swaps]);
  };

  /** 상태를 바꿉니다. 상대 확인 → 사장님 승인 → 완료 순으로 넘어갑니다. */
  const setStatus = (id: number, status: SwapStatus) => {
    setSwaps(swaps.map((swap) => (swap.id === id ? { ...swap, status } : swap)));
  };

  /** 아직 처리가 끝나지 않은 요청들 */
  const pending = swaps.filter(
    (swap) => swap.status === "pending_target" || swap.status === "pending_owner"
  );

  return { swaps, pending, addSwap, setStatus };
}
