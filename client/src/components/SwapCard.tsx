import { ArrowLeftRight, Check, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/useConfirm";
import type { SwapRow, SwapStatus } from "@/types";

/**
 * 교대 요청 한 장.
 *
 * 근무표 화면과 교대 관리 화면이 함께 씁니다.
 * 생김새를 바꾸려면 여기만 고치면 두 화면이 같이 바뀝니다.
 */

export const STATUS_LABEL: Record<SwapStatus, { text: string; className: string }> = {
  pending_target: { text: "상대 확인 대기", className: "bg-slate-100 text-slate-700" },
  pending_owner: { text: "사장님 승인 대기", className: "bg-amber-50 text-amber-700" },
  approved: { text: "승인 완료", className: "bg-emerald-50 text-emerald-700" },
  rejected: { text: "반려", className: "bg-rose-50 text-rose-700" },
};

export function SwapCard({
  swap,
  isOwnerMode,
  myName,
  onStatusChange,
  onRemove,
}: {
  swap: SwapRow;
  isOwnerMode: boolean;
  /** 지금 들어와 있는 사람 이름 */
  myName: string;
  onStatusChange: (id: number, status: SwapStatus) => void;
  onRemove: (id: number) => void;
}) {
  const status = STATUS_LABEL[swap.status];
  const { ask, confirmDialog } = useConfirm();

  /**
   * 이 요청을 없앨 수 있는 사람인가.
   *
   * · 아직 처리 중이면 → 당사자(바꿀 사람·대신할 사람)나 사장님
   * · 이미 끝난 것이면 → 사장님만 (기록을 정리할 때)
   */
  const involved = swap.fromName === myName || swap.toName === myName;
  const inProgress =
    swap.status === "pending_target" || swap.status === "pending_owner";
  const canRemove = isOwnerMode || (involved && inProgress);

  const remove = async () => {
    if (!(await ask(`${swap.workDate} 교대 요청을 없앨까요?`))) return;
    onRemove(swap.id);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">
            {swap.workDate} · {swap.start}–{swap.end}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            {swap.fromName}
            <ArrowLeftRight className="h-3 w-3 shrink-0 text-slate-300" />
            {swap.toName}
          </p>
          {swap.reason && <p className="mt-1 text-xs text-slate-400">{swap.reason}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Badge className={`border-0 ${status.className}`}>{status.text}</Badge>
          {canRemove && (
            <button
              onClick={remove}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label={`${swap.workDate} 교대 요청 없애기`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3단계: 사장님 승인·반려 */}
      {isOwnerMode && swap.status === "pending_owner" && (
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => onStatusChange(swap.id, "approved")}
            className="h-10 flex-1 rounded-xl bg-slate-900 text-xs font-bold hover:bg-slate-800"
          >
            <Check className="mr-1.5 h-4 w-4" />
            승인
          </Button>
          <Button
            variant="outline"
            onClick={() => onStatusChange(swap.id, "rejected")}
            className="h-10 flex-1 rounded-xl border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
          >
            <X className="mr-1.5 h-4 w-4" />
            반려
          </Button>
        </div>
      )}

      {/* 2단계: 상대 알바생 확인·거절 */}
      {!isOwnerMode && swap.status === "pending_target" && (
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => onStatusChange(swap.id, "pending_owner")}
            className="h-10 flex-1 rounded-xl bg-slate-900 text-xs font-bold hover:bg-slate-800"
          >
            <Check className="mr-1.5 h-4 w-4" />
            내용 확인
          </Button>
          <Button
            variant="outline"
            onClick={() => onStatusChange(swap.id, "rejected")}
            className="h-10 flex-1 rounded-xl text-xs font-bold"
          >
            거절
          </Button>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
