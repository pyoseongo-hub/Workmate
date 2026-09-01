import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { useSwaps } from "@/hooks/useSwaps";
import { SwapCard } from "@/components/SwapCard";
import { SwapDialog } from "@/components/SwapDialog";

/**
 * 교대 관리 — 교대 요청을 목록으로 몰아 보는 화면입니다.
 *
 * 달력을 보면서 신청·승인하려면 근무표 화면이 더 편합니다.
 * 여기는 "이번에 처리할 게 몇 건인지" 한눈에 볼 때 씁니다.
 * 두 화면은 같은 저장소를 보므로 어느 쪽에서 처리하든 함께 반영됩니다.
 *
 * 규칙 (사용자 확정):
 *   · 신청 → 알바생이 합니다.
 *   · 승인 → 사장님만 합니다.
 *
 * 교대는 3단계를 거칩니다:
 *   1) 신청       내가 상대에게 교대를 요청     → 상대 확인 대기
 *   2) 상대 확인  상대가 수락하면              → 사장님 승인 대기
 *   3) 사장 승인  사장님이 승인하면            → 승인 완료
 */
export default function Swaps() {
  const { isOwnerMode } = useRole();
  const { swaps, addSwap, setStatus } = useSwaps();
  const [showDialog, setShowDialog] = useState(false);

  // 사장님은 "승인 대기"만, 알바생은 전체를 봅니다.
  const visible = isOwnerMode
    ? swaps.filter((swap) => swap.status === "pending_owner")
    : swaps;

  return (
    <AppLayout
      title="교대 관리"
      description={
        isOwnerMode
          ? "승인을 기다리는 교대를 모아 보여드려요."
          : "신청한 교대의 진행 상태를 모아 보여드려요."
      }
      action={
        // 신청은 알바생이 합니다. 사장님 모드에서는 숨깁니다.
        !isOwnerMode && (
          <Button
            onClick={() => setShowDialog(true)}
            className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            교대 신청
          </Button>
        )
      }
    >
      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
          <CardTitle className="text-lg font-extrabold tracking-tight">
            {isOwnerMode ? "승인 대기 목록" : "내 교대 요청"}
          </CardTitle>
          <p className="mt-1 text-xs text-slate-400">
            날짜를 보면서 처리하려면 근무표 화면에서 달력을 눌러 보세요.
          </p>
        </CardHeader>

        <CardContent className="p-4 sm:p-7">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">
              {isOwnerMode
                ? "승인을 기다리는 교대가 없습니다."
                : "아직 신청한 교대가 없습니다."}
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((swap) => (
                <SwapCard
                  key={swap.id}
                  swap={swap}
                  isOwnerMode={isOwnerMode}
                  onStatusChange={setStatus}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showDialog && (
        <SwapDialog
          onSubmit={(form) => {
            addSwap(form);
            setShowDialog(false);
          }}
          onClose={() => setShowDialog(false)}
        />
      )}
    </AppLayout>
  );
}
