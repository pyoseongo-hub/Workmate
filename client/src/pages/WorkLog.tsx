import { useState } from "react";
import { ChevronLeft, ChevronRight, FileClock, LockKeyhole, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { FormDialog, Field, inputClass } from "@/components/FormDialog";

/**
 * 근무일지 — 예정 근무와 실제 출퇴근을 나눠서 기록하는 화면입니다.
 *
 * 규칙 (사용자 확정):
 *   · 지난 날짜 기록은 잠깁니다.
 *   · 잠긴 기록은 사장님만 수정할 수 있습니다.
 *
 * 지금은 이 화면 안에만 남습니다(새로고침하면 사라짐).
 * 다음 단계에서 trpc.workLogs 로 서버에 저장하도록 바꿉니다.
 */

type LogRow = {
  id: number;
  workDate: string; // "2026-09-01"
  planned: string; // 예정 근무 "09:00–18:00"
  clockIn: string; // 실제 출근 "09:03"
  clockOut: string; // 실제 퇴근 "18:02"
  note: string;
};

/** 오늘 날짜를 "2026-09-01" 모양으로 */
function todayString() {
  return new Date().toISOString().slice(0, 10);
}

/** 지난 날짜인가? (오늘은 아직 잠기지 않습니다) */
function isPast(workDate: string) {
  return workDate < todayString();
}

export default function WorkLog() {
  const { isOwnerMode } = useRole();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [editing, setEditing] = useState<LogRow | "new" | null>(null);

  const goPrev = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goNext = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  // 지금 보고 있는 달의 기록만 골라 최신순으로 보여줍니다.
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const visible = logs
    .filter((log) => log.workDate.startsWith(monthPrefix))
    .sort((a, b) => b.workDate.localeCompare(a.workDate));

  const save = (form: Omit<LogRow, "id">) => {
    if (editing === "new") {
      const nextId = Math.max(0, ...logs.map((log) => log.id)) + 1;
      setLogs([...logs, { ...form, id: nextId }]);
    } else if (editing) {
      setLogs(logs.map((log) => (log.id === editing.id ? { ...form, id: log.id } : log)));
    }
    setEditing(null);
  };

  return (
    <AppLayout
      title="근무일지"
      description="예정 근무와 실제 출퇴근을 나눠서 기록합니다."
      action={
        <Button
          onClick={() => setEditing("new")}
          className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold hover:bg-slate-800"
        >
          <FileClock className="h-4 w-4" />
          근무일지 작성
        </Button>
      }
    >
      {/* 잠금 안내 */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs leading-5 text-amber-800">
          <span className="font-bold">지난 날짜 기록은 잠깁니다.</span>{" "}
          {isOwnerMode
            ? "사장님 모드라 잠긴 기록도 수정할 수 있어요."
            : "수정이 필요하면 사장님께 요청해 주세요."}
        </p>
      </div>

      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
          <CardTitle className="text-lg font-extrabold tracking-tight">
            {year}년 {month}월 기록
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goPrev}
              className="h-9 w-9 rounded-xl border-slate-200"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goNext}
              className="h-9 w-9 rounded-xl border-slate-200"
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-7">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">
              이 달에는 아직 기록이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((log) => {
                const locked = isPast(log.workDate);
                return (
                  <LogItem
                    key={log.id}
                    log={log}
                    locked={locked}
                    canEdit={isOwnerMode || !locked}
                    onEdit={() => setEditing(log)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <LogDialog
          initial={editing === "new" ? null : editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </AppLayout>
  );
}

/** 근무일지 목록의 한 줄 */
function LogItem({
  log,
  locked,
  canEdit,
  onEdit,
}: {
  log: LogRow;
  locked: boolean;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-slate-900">{log.workDate}</p>
          {locked && <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-slate-500">
            예정 <span className="font-semibold text-slate-700">{log.planned}</span>
          </span>
          <span className="text-slate-500">
            실제{" "}
            <span className="font-semibold text-emerald-700">
              {log.clockIn}–{log.clockOut}
            </span>
          </span>
        </div>

        {log.note && <p className="mt-1 truncate text-xs text-slate-400">{log.note}</p>}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={!canEdit}
        onClick={onEdit}
        className="shrink-0 gap-1.5 rounded-xl text-xs"
      >
        <PenLine className="h-3.5 w-3.5" />
        수정
      </Button>
    </div>
  );
}

/** 근무일지 작성·수정 창 */
function LogDialog({
  initial,
  onSubmit,
  onClose,
}: {
  initial: LogRow | null;
  onSubmit: (form: Omit<LogRow, "id">) => void;
  onClose: () => void;
}) {
  const [workDate, setWorkDate] = useState(initial?.workDate ?? todayString());
  const [plannedStart, setPlannedStart] = useState(
    initial?.planned.split("–")[0] ?? "09:00"
  );
  const [plannedEnd, setPlannedEnd] = useState(
    initial?.planned.split("–")[1] ?? "18:00"
  );
  const [clockIn, setClockIn] = useState(initial?.clockIn ?? "09:00");
  const [clockOut, setClockOut] = useState(initial?.clockOut ?? "18:00");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  const submit = () => {
    if (plannedStart >= plannedEnd) {
      setError("예정 근무의 종료 시간이 시작보다 늦어야 합니다.");
      return;
    }
    if (clockIn >= clockOut) {
      setError("실제 퇴근 시간이 출근보다 늦어야 합니다.");
      return;
    }
    onSubmit({
      workDate,
      planned: `${plannedStart}–${plannedEnd}`,
      clockIn,
      clockOut,
      note: note.trim(),
    });
  };

  return (
    <FormDialog
      title={initial ? "근무일지 수정" : "근무일지 작성"}
      description="예정 근무와 실제 출퇴근을 따로 적어 주세요."
      submitLabel={initial ? "수정하기" : "저장하기"}
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

      <div>
        <span className="text-xs font-bold text-slate-600">예정 근무</span>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            type="time"
            value={plannedStart}
            onChange={(event) => {
              setPlannedStart(event.target.value);
              setError("");
            }}
            className={inputClass.replace("mt-2 ", "")}
          />
          <input
            type="time"
            value={plannedEnd}
            onChange={(event) => {
              setPlannedEnd(event.target.value);
              setError("");
            }}
            className={inputClass.replace("mt-2 ", "")}
          />
        </div>
      </div>

      <div>
        <span className="text-xs font-bold text-emerald-700">실제 출퇴근</span>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            type="time"
            value={clockIn}
            onChange={(event) => {
              setClockIn(event.target.value);
              setError("");
            }}
            className={`${inputClass.replace("mt-2 ", "")} border-emerald-200`}
          />
          <input
            type="time"
            value={clockOut}
            onChange={(event) => {
              setClockOut(event.target.value);
              setError("");
            }}
            className={`${inputClass.replace("mt-2 ", "")} border-emerald-200`}
          />
        </div>
      </div>

      <Field label="특이사항 (선택)">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="대체 근무, 지각 사유, 매장 이슈 등을 적어주세요."
          className="mt-2 min-h-20 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
        />
      </Field>
    </FormDialog>
  );
}
