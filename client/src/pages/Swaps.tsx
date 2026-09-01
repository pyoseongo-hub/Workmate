import { useState } from "react";
import { ArrowLeftRight, Check, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { useLocalState } from "@/hooks/useLocalState";
import { FormDialog, Field, inputClass } from "@/components/FormDialog";
import { STORAGE_KEYS, type SwapRow, type SwapStatus } from "@/types";

/**
 * 교대 관리 — 근무를 바꾸는 요청을 다루는 화면입니다.
 *
 * 규칙 (사용자 확정):
 *   · 신청 → 알바생이 합니다.
 *   · 승인 → 사장님만 합니다.
 *
 * 교대는 3단계를 거칩니다:
 *   1) 신청       내가 상대에게 교대를 요청     → 상대 확인 대기
 *   2) 상대 확인  상대가 수락하면              → 사장님 승인 대기
 *   3) 사장 승인  사장님이 승인하면            → 승인 완료
 *
 * 신청한 교대는 브라우저에 저장되어 새로고침해도 남습니다.
 * 다음 단계에서 서버에 저장하도록 바꿉니다.
 */

const STATUS_LABEL: Record<SwapStatus, { text: string; className: string }> = {
  pending_target: { text: "상대 확인 대기", className: "bg-slate-100 text-slate-700" },
  pending_owner: { text: "사장님 승인 대기", className: "bg-amber-50 text-amber-700" },
  approved: { text: "승인 완료", className: "bg-emerald-50 text-emerald-700" },
  rejected: { text: "반려", className: "bg-rose-50 text-rose-700" },
};

export default function Swaps() {
  const { isOwnerMode } = useRole();

  const [swaps, setSwaps] = useLocalState<SwapRow[]>(STORAGE_KEYS.swaps, []);
  const [showDialog, setShowDialog] = useState(false);

  // 사장님은 "승인 대기"만, 알바생은 전체를 봅니다.
  const visible = isOwnerMode
    ? swaps.filter((swap) => swap.status === "pending_owner")
    : swaps;

  const addSwap = (form: Omit<SwapRow, "id" | "status">) => {
    const nextId = Math.max(0, ...swaps.map((swap) => swap.id)) + 1;
    setSwaps([{ ...form, id: nextId, status: "pending_target" }, ...swaps]);
    setShowDialog(false);
  };

  const setStatus = (id: number, status: SwapStatus) => {
    setSwaps(swaps.map((swap) => (swap.id === id ? { ...swap, status } : swap)));
  };

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
            전화·카톡으로 합의한 내용도 여기서 최종 확정해요.
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
                <SwapItem
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
        <SwapDialog onSubmit={addSwap} onClose={() => setShowDialog(false)} />
      )}
    </AppLayout>
  );
}

/** 교대 요청 한 장 */
function SwapItem({
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
          {swap.reason && (
            <p className="mt-1 text-xs text-slate-400">{swap.reason}</p>
          )}
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

/** 교대 신청 창 */
function SwapDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (form: Omit<SwapRow, "id" | "status">) => void;
  onClose: () => void;
}) {
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!fromName.trim() || !toName.trim()) {
      setError("바꿀 사람과 대신할 사람을 모두 적어 주세요.");
      return;
    }
    if (fromName.trim() === toName.trim()) {
      setError("같은 사람끼리는 교대할 수 없습니다.");
      return;
    }
    if (start >= end) {
      setError("종료 시간이 시작 시간보다 늦어야 합니다.");
      return;
    }
    onSubmit({
      workDate,
      start,
      end,
      fromName: fromName.trim(),
      toName: toName.trim(),
      reason: reason.trim(),
    });
  };

  return (
    <FormDialog
      title="교대 신청"
      description="상대가 확인하면 사장님 승인으로 넘어갑니다."
      submitLabel="신청하기"
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="근무 날짜">
        <input
          type="date"
          value={workDate}
          onChange={(event) => setWorkDate(event.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="시작">
          <input
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="종료">
          <input
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="원래 근무자">
          <input
            value={fromName}
            autoFocus
            onChange={(event) => {
              setFromName(event.target.value);
              setError("");
            }}
            placeholder="예: 민수"
            className={inputClass}
          />
        </Field>
        <Field label="대신할 사람">
          <input
            value={toName}
            onChange={(event) => {
              setToName(event.target.value);
              setError("");
            }}
            placeholder="예: 서연"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="사유 (선택)">
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="예: 병원 예약"
          className={inputClass}
        />
      </Field>
    </FormDialog>
  );
}
