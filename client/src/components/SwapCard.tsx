import { ArrowLeftRight, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onStatusChange,
}: {
  swap: SwapRow;
  isOwnerMode: boolean;
  onStatusChange: (id: number, status: SwapStatus) => void;
}) {
  const status = STATUS_LABEL[swap.status];

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

        <Badge className={`shrink-0 border-0 ${status.className}`}>{status.text}</Badge>
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
    </div>
  );
}
