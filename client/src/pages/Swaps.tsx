import { ArrowLeftRight, Check, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";

/**
 * 교대 관리 — 근무를 바꾸는 요청을 다루는 화면입니다.
 *
 * 규칙 (사용자 확정):
 *   · 신청 → 알바생이 합니다.
 *   · 승인 → 사장님만 합니다.
 *
 * 교대는 3단계를 거칩니다:
 *   1) 신청       내가 상대에게 교대를 요청  (swaps.request)
 *   2) 상대 확인  상대가 수락 또는 거절      (swaps.confirm)
 *   3) 사장 승인  사장님이 최종 승인 또는 반려 (swaps.decide)
 *
 * TODO(2단계): trpc.swaps.pending / request / confirm / decide 를 연결합니다.
 */

/** 교대 요청 한 건 */
type SwapRow = {
  id: number;
  workDate: string;
  time: string;
  fromName: string;
  toName: string;
  status: "pending_target" | "pending_owner" | "approved" | "rejected";
};

const STATUS_LABEL: Record<SwapRow["status"], { text: string; className: string }> = {
  pending_target: { text: "상대 확인 대기", className: "bg-slate-100 text-slate-700" },
  pending_owner: { text: "사장님 승인 대기", className: "bg-amber-50 text-amber-700" },
  approved: { text: "승인 완료", className: "bg-emerald-50 text-emerald-700" },
  rejected: { text: "반려", className: "bg-rose-50 text-rose-700" },
};

export default function Swaps() {
  const { isOwnerMode } = useRole();

  // 아직 연결 전이라 빈 배열입니다.
  const swaps: SwapRow[] = [];

  // 사장님은 "승인 대기"만, 알바생은 전체를 봅니다.
  const visible = isOwnerMode
    ? swaps.filter((swap) => swap.status === "pending_owner")
    : swaps;

  return (
    <AppLayout
      title="교대 관리"
      description={
        isOwnerMode
          ? "알바생끼리 합의한 교대를 최종 승인해 주세요."
          : "근무를 바꾸고 싶을 때 상대에게 교대를 신청하세요."
      }
      action={
        // 신청은 알바생이 합니다. 사장님 모드에서는 숨깁니다.
        !isOwnerMode && (
          <Button className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            교대 신청
          </Button>
        )
      }
    >
      <Card className="overflow-hidden rounded-3xl border-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <CardTitle className="text-lg font-extrabold tracking-tight">
            {isOwnerMode ? "승인 대기 목록" : "내 교대 요청"}
          </CardTitle>
          <p className="mt-1 text-xs text-slate-400">
            전화·카톡으로 합의한 내용도 여기서 최종 확정해요.
          </p>
        </CardHeader>

        <CardContent className="p-5 sm:p-7">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">
              {isOwnerMode
                ? "승인을 기다리는 교대가 없습니다."
                : "아직 신청한 교대가 없습니다."}
              <br />
              (2단계에서 서버와 연결할 예정입니다)
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((swap) => (
                <SwapItem key={swap.id} swap={swap} isOwnerMode={isOwnerMode} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}

/** 교대 요청 한 장 */
function SwapItem({ swap, isOwnerMode }: { swap: SwapRow; isOwnerMode: boolean }) {
  const status = STATUS_LABEL[swap.status];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">
            {swap.workDate} · {swap.time}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            {swap.fromName}
            <ArrowLeftRight className="h-3 w-3 text-slate-300" />
            {swap.toName}
          </p>
        </div>

        <Badge className={`shrink-0 border-0 ${status.className}`}>{status.text}</Badge>
      </div>

      {/* 승인·반려 버튼은 사장님 모드에서, 승인 대기 상태일 때만 보입니다 */}
      {isOwnerMode && swap.status === "pending_owner" && (
        <div className="mt-4 flex gap-2">
          <Button className="h-10 flex-1 rounded-xl bg-slate-900 text-xs font-bold hover:bg-slate-800">
            <Check className="mr-1.5 h-4 w-4" />
            승인
          </Button>
          <Button
            variant="outline"
            className="h-10 flex-1 rounded-xl border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
          >
            <X className="mr-1.5 h-4 w-4" />
            반려
          </Button>
        </div>
      )}

      {/* 알바생이 상대일 때 — 확인·거절 */}
      {!isOwnerMode && swap.status === "pending_target" && (
        <div className="mt-4 flex gap-2">
          <Button className="h-10 flex-1 rounded-xl bg-slate-900 text-xs font-bold hover:bg-slate-800">
            <Check className="mr-1.5 h-4 w-4" />
            내용 확인
          </Button>
          <Button variant="outline" className="h-10 flex-1 rounded-xl text-xs font-bold">
            거절
          </Button>
        </div>
      )}
    </div>
  );
}
