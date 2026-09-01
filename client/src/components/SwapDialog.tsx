import { useState } from "react";
import { FormDialog, Field, inputClass } from "@/components/FormDialog";
import { todayString, type SwapRow } from "@/types";

/**
 * 교대 신청 창.
 *
 * 근무표 화면에서는 달력에서 고른 근무가 미리 채워집니다.
 * (날짜·시간·원래 근무자를 다시 적지 않아도 됩니다)
 */
export function SwapDialog({
  defaults,
  onSubmit,
  onClose,
}: {
  /** 달력에서 고른 근무. 없으면 빈 칸으로 시작합니다. */
  defaults?: { workDate?: string; start?: string; end?: string; fromName?: string };
  onSubmit: (form: Omit<SwapRow, "id" | "status">) => void;
  onClose: () => void;
}) {
  const [workDate, setWorkDate] = useState(defaults?.workDate ?? todayString());
  const [start, setStart] = useState(defaults?.start ?? "09:00");
  const [end, setEnd] = useState(defaults?.end ?? "18:00");
  const [fromName, setFromName] = useState(defaults?.fromName ?? "");
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
            onChange={(event) => {
              setStart(event.target.value);
              setError("");
            }}
            className={inputClass}
          />
        </Field>
        <Field label="종료">
          <input
            type="time"
            value={end}
            onChange={(event) => {
              setEnd(event.target.value);
              setError("");
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="원래 근무자">
          <input
            value={fromName}
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
            autoFocus
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
