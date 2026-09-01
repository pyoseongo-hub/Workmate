import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { FormDialog, Field, inputClass } from "@/components/FormDialog";

/**
 * 근무표 — 한 달 달력에 누가 언제 일하는지 보여주는 화면입니다.
 *
 * 지금은 등록한 근무가 이 화면 안에만 남습니다(새로고침하면 사라짐).
 * 다음 단계에서 trpc.schedules 로 서버에 저장하도록 바꿉니다.
 */

/** 달력에 그릴 근무 한 칸 */
type Shift = {
  day: number;
  person: string;
  time: string;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 폰 달력 칸은 폭이 50px 남짓이라 "09:00–18:00" 이 잘립니다.
 * 그래서 폰에서는 "9-18" 처럼 시(時)만 남겨 보여줍니다.
 */
function shortTime(time: string) {
  return time
    .split("–")
    .map((part) => String(Number(part.slice(0, 2))))
    .join("-");
}

export default function Schedule() {
  const { isOwnerMode } = useRole();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1~12

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showDialog, setShowDialog] = useState(false);

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

  /**
   * 반복 근무를 이 달 달력에 펼쳐 넣습니다.
   * 예: "월·수·금 09:00–18:00" → 이 달의 모든 월·수·금에 근무를 만듭니다.
   */
  const addRecurring = (form: {
    person: string;
    weekdays: number[];
    start: string;
    end: string;
  }) => {
    const lastDay = new Date(year, month, 0).getDate();
    const added: Shift[] = [];

    for (let day = 1; day <= lastDay; day += 1) {
      const weekday = new Date(year, month - 1, day).getDay();
      if (!form.weekdays.includes(weekday)) continue;

      // 같은 날 같은 사람이 이미 있으면 건너뜁니다
      const already = shifts.some(
        (shift) => shift.day === day && shift.person === form.person
      );
      if (already) continue;

      added.push({ day, person: form.person, time: `${form.start}–${form.end}` });
    }

    setShifts([...shifts, ...added]);
    setShowDialog(false);
  };

  return (
    <AppLayout
      title="근무표"
      description="기본 근무일자와 확정된 교대 내용을 한눈에 확인하세요."
      action={
        isOwnerMode && (
          <Button
            onClick={() => setShowDialog(true)}
            className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            근무일자 등록
          </Button>
        )
      }
    >
      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
          <div>
            <CardTitle className="text-lg font-extrabold tracking-tight">
              {year}년 {month}월
            </CardTitle>
            <p className="mt-1 text-xs text-slate-400">
              {isOwnerMode ? "전체 직원 근무" : "내 근무일과 확정 교대"}
            </p>
          </div>

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

        <CardContent className="p-3 sm:p-7">
          <CalendarGrid year={year} month={month} shifts={shifts} />
        </CardContent>
      </Card>

      {showDialog && (
        <ScheduleDialog onSubmit={addRecurring} onClose={() => setShowDialog(false)} />
      )}
    </AppLayout>
  );
}

/**
 * 달력 그리드.
 *
 * 그 달 1일이 무슨 요일인지 계산해서 앞을 비웁니다.
 * 폰에서는 7칸이 화면에 딱 들어가야 하므로 min-w-full 을 씁니다.
 */
function CalendarGrid({
  year,
  month,
  shifts,
}: {
  year: number;
  month: number;
  shifts: Shift[];
}) {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const lastDay = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];

  const todayStr = new Date().toDateString();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full sm:min-w-[680px]">
        <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-[10px] font-semibold text-slate-400 sm:text-[11px] sm:uppercase sm:tracking-[0.16em]">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-slate-100">
          {cells.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[62px] bg-slate-50/80 sm:min-h-[108px]"
                />
              );
            }

            const isToday = new Date(year, month - 1, day).toDateString() === todayStr;
            const dayShifts = shifts.filter((item) => item.day === day);

            return (
              <div
                key={day}
                className="min-h-[62px] bg-white p-1 transition-colors hover:bg-slate-50 sm:min-h-[108px] sm:p-2.5"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold sm:h-6 sm:w-6 sm:text-xs ${
                    isToday ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  {day}
                </span>

                {dayShifts.map((shift, i) => (
                  <div
                    key={i}
                    className="mt-1 rounded-md border border-blue-200 bg-blue-50 px-1 py-0.5 text-[9px] leading-tight text-blue-800 sm:mt-2 sm:rounded-xl sm:px-2 sm:py-2 sm:text-[11px]"
                  >
                    <div className="truncate font-bold">{shift.person}</div>
                    <div className="mt-0.5 truncate opacity-75 sm:mt-1">
                      <span className="sm:hidden">{shortTime(shift.time)}</span>
                      <span className="hidden sm:inline">{shift.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {shifts.length === 0 && (
          <p className="mt-5 text-center text-xs text-slate-400">
            아직 등록된 근무가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

/** 근무일자 등록 창 */
function ScheduleDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (form: {
    person: string;
    weekdays: number[];
    start: string;
    end: string;
  }) => void;
  onClose: () => void;
}) {
  const [person, setPerson] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [error, setError] = useState("");

  const toggleWeekday = (index: number) => {
    setError("");
    setWeekdays(
      weekdays.includes(index)
        ? weekdays.filter((value) => value !== index)
        : [...weekdays, index]
    );
  };

  const submit = () => {
    if (!person.trim()) {
      setError("직원 이름을 적어 주세요.");
      return;
    }
    if (weekdays.length === 0) {
      setError("반복할 요일을 하나 이상 골라 주세요.");
      return;
    }
    if (start >= end) {
      setError("종료 시간이 시작 시간보다 늦어야 합니다.");
      return;
    }
    onSubmit({ person: person.trim(), weekdays, start, end });
  };

  return (
    <FormDialog
      title="근무일자 등록"
      description="반복되는 근무를 등록하면 이 달 달력에 한 번에 채워집니다."
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="직원 이름">
        <input
          value={person}
          autoFocus
          onChange={(event) => {
            setPerson(event.target.value);
            setError("");
          }}
          placeholder="예: 서연"
          className={inputClass}
        />
      </Field>

      <div>
        <span className="text-xs font-bold text-slate-600">반복 요일</span>
        <div className="mt-2 flex gap-1.5">
          {WEEKDAYS.map((label, index) => {
            const selected = weekdays.includes(index);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleWeekday(index)}
                className={`h-10 flex-1 rounded-xl text-sm font-bold transition ${
                  selected
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

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
    </FormDialog>
  );
}
