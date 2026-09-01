import { useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { useSharedState } from "@/hooks/useSharedState";
import { useSwaps } from "@/hooks/useSwaps";
import { SwapCard } from "@/components/SwapCard";
import { SwapDialog } from "@/components/SwapDialog";
import { FormDialog, Field, inputClass } from "@/components/FormDialog";
import { STORAGE_KEYS, pad, toDateString, type Member, type Shift } from "@/types";

/**
 * 근무표 — 달력을 보면서 교대까지 처리하는 화면입니다.
 *
 * 왜 교대를 여기에 두었나 (사용자 요청):
 *   교대 관리 화면만 따로 있으면, 날짜를 손으로 적어야 하고
 *   "그날 누가 일하는지"를 못 본 채로 신청·승인하게 됩니다.
 *   달력에서 날짜를 고르면 그 근무가 그대로 신청서에 들어갑니다.
 *
 * 화면이 넓으면(PC) 달력이 왼쪽에 붙어 있어 스크롤해도 계속 보입니다.
 * 폰에서는 달력이 화면을 거의 다 차지하므로, 대신 고른 날짜를 담은
 * 얇은 띠가 위에 붙어 지금 어느 날을 다루는지 늘 보이게 했습니다.
 */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-09-15" → "9월 15일 (화)" */
function formatDateLabel(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

/**
 * 폰 달력 칸은 폭이 50px 남짓이라 "09:00–18:00" 이 잘립니다.
 * 그래서 폰에서는 "9-18" 처럼 시(時)만 남겨 보여줍니다.
 */
function shortTime(start: string, end: string) {
  return `${Number(start.slice(0, 2))}-${Number(end.slice(0, 2))}`;
}

export default function Schedule() {
  const { isOwnerMode, myName, members } = useRole();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1~12

  const [shifts, setShifts] = useSharedState<Shift[]>(STORAGE_KEYS.shifts, []);
  const { swaps, addSwap, setStatus } = useSwaps();

  /** 달력에서 고른 날짜. 안 골랐으면 null */
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  /**
   * 빠른 등록 — 30일치를 하나씩 창을 열어 넣으면 너무 번거롭습니다.
   * 이름과 시간을 한 번 정해 두고 켜면, 그 뒤로는 날짜를 누를 때마다
   * 바로 등록됩니다. 이미 있는 날을 다시 누르면 지워집니다.
   */
  const [quickAdd, setQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState(myName);
  const [quickStart, setQuickStart] = useState("09:00");
  const [quickEnd, setQuickEnd] = useState("18:00");

  // 직원 목록이 나중에 도착하므로, 이름이 비어 있으면 첫 직원으로 채웁니다.
  const pickName = quickName || myName || members[0]?.name || "";

  const monthPrefix = `${year}-${pad(month)}`;
  const monthShifts = shifts.filter((shift) => shift.workDate.startsWith(monthPrefix));

  const goPrev = () => {
    setSelectedDate(null);
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goNext = () => {
    setSelectedDate(null);
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

      const workDate = toDateString(year, month, day);

      // 같은 날 같은 사람이 이미 있으면 건너뜁니다
      const already = shifts.some(
        (shift) => shift.workDate === workDate && shift.person === form.person
      );
      if (already) continue;

      added.push({ workDate, person: form.person, start: form.start, end: form.end });
    }

    setShifts([...shifts, ...added]);
    setShowScheduleDialog(false);
  };

  const removeShift = (target: Shift) => {
    if (!confirm(`${formatDateLabel(target.workDate)} ${target.person} 근무를 지울까요?`)) {
      return;
    }
    setShifts(
      shifts.filter(
        (shift) =>
          !(shift.workDate === target.workDate && shift.person === target.person)
      )
    );
  };

  /**
   * 달력 칸을 눌렀을 때.
   *
   * 빠른 등록이 꺼져 있으면 → 그 날짜를 골라 아래에 자세히 보여 줍니다.
   * 켜져 있으면 → 고른 이름으로 그 날 근무를 넣고, 이미 있으면 지웁니다.
   */
  const handleDateClick = (workDate: string) => {
    if (!quickAdd) {
      setSelectedDate(workDate === selectedDate ? null : workDate);
      return;
    }

    if (!pickName) return;

    const already = shifts.some(
      (shift) => shift.workDate === workDate && shift.person === pickName
    );

    if (already) {
      setShifts(
        shifts.filter(
          (shift) => !(shift.workDate === workDate && shift.person === pickName)
        )
      );
    } else {
      setShifts([
        ...shifts,
        { workDate, person: pickName, start: quickStart, end: quickEnd },
      ]);
    }
  };

  /** 빠른 등록을 켜고 끕니다. */
  const toggleQuickAdd = () => {
    setQuickAdd(!quickAdd);
    setSelectedDate(null);
  };

  // 고른 날짜의 근무와 교대
  const selectedShifts = selectedDate
    ? shifts.filter((shift) => shift.workDate === selectedDate)
    : [];
  const selectedSwaps = selectedDate
    ? swaps.filter((swap) => swap.workDate === selectedDate)
    : [];

  // 날짜를 안 골랐으면 이 달 전체 교대를 보여줍니다.
  const listedSwaps = selectedDate
    ? selectedSwaps
    : swaps.filter((swap) => swap.workDate.startsWith(monthPrefix));

  return (
    <AppLayout
      title="근무표"
      description="달력에서 날짜를 누르면 그 날의 근무와 교대를 함께 볼 수 있어요."
      action={
        isOwnerMode && (
          <Button
            onClick={() => setShowScheduleDialog(true)}
            className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            근무일자 등록
          </Button>
        )
      }
    >
      {/* 폰에서 스크롤해도 "지금 고른 날짜"가 위에 붙어 보입니다 */}
      {selectedDate && (
        <div className="sticky top-[72px] z-10 -mx-3 border-b border-slate-200 bg-[#f6f8fb]/95 px-3 py-2.5 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">
                {formatDateLabel(selectedDate)}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {selectedShifts.length === 0
                  ? "등록된 근무 없음"
                  : selectedShifts
                      .map((shift) => `${shift.person} ${shortTime(shift.start, shift.end)}`)
                      .join(" · ")}
              </p>
            </div>
            <Button
              onClick={() => setShowSwapDialog(true)}
              className="h-9 shrink-0 gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold hover:bg-slate-800"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              교대 신청
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-5">
        {/* ─── 왼쪽: 달력 (PC에서는 스크롤해도 붙어 있음) ─── */}
        <div className="lg:sticky lg:top-[88px]">
          <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <CardTitle className="text-lg font-extrabold tracking-tight">
                  {year}년 {month}월
                </CardTitle>
                <p className="mt-1 text-xs text-slate-400">날짜를 눌러 보세요</p>
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

            <CardContent className="p-3 sm:p-5">
              {/* 빠른 등록 — 이름과 시간을 정해 두고 날짜를 눌러 넣습니다 */}
              <div
                className={`mb-3 space-y-2 rounded-2xl border p-2.5 transition ${
                  quickAdd
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                {/* 폰에서는 이름과 시간을 한 줄에 넣으면 시간칸이 잘려
                    ":00 오전" 처럼만 보입니다. 그래서 줄을 나눕니다. */}
                <select
                  value={pickName}
                  onChange={(event) => setQuickName(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold outline-none focus:border-blue-500"
                  aria-label="근무자"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={quickStart}
                    onChange={(event) => setQuickStart(event.target.value)}
                    aria-label="시작 시간"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500"
                  />
                  <span className="shrink-0 text-xs text-slate-400">~</span>
                  <input
                    type="time"
                    value={quickEnd}
                    onChange={(event) => setQuickEnd(event.target.value)}
                    aria-label="종료 시간"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <Button
                  onClick={toggleQuickAdd}
                  disabled={!pickName}
                  className={`h-9 w-full rounded-lg text-xs font-bold ${
                    quickAdd
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {quickAdd ? "등록 끝내기" : "＋ 이 시간으로 근무 등록"}
                </Button>

                {quickAdd ? (
                  <p className="text-center text-[11px] font-semibold leading-4 text-blue-700">
                    달력에서 날짜를 누르면 <b>{pickName}</b> 근무가 들어갑니다.
                    <br />
                    이미 있는 날을 다시 누르면 지워져요.
                  </p>
                ) : (
                  members.length <= 1 && (
                    <p className="text-center text-[11px] leading-4 text-amber-700">
                      직원 관리에서 직원을 먼저 등록하면 여기서 고를 수 있어요.
                    </p>
                  )
                )}
              </div>

              <CalendarGrid
                year={year}
                month={month}
                shifts={monthShifts}
                swaps={swaps}
                selectedDate={selectedDate}
                quickAdd={quickAdd}
                quickName={pickName}
                onSelect={handleDateClick}
              />
            </CardContent>
          </Card>
        </div>

        {/* ─── 오른쪽: 고른 날짜의 근무와 교대 ─── */}
        <div className="space-y-4">
          {selectedDate ? (
            <Card className="rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-extrabold text-slate-900">
                      {formatDateLabel(selectedDate)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {selectedShifts.length === 0
                        ? "이 날은 등록된 근무가 없어요"
                        : `근무 ${selectedShifts.length}건`}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowSwapDialog(true)}
                    className="hidden h-9 shrink-0 gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold hover:bg-slate-800 lg:flex"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    교대 신청
                  </Button>
                </div>

                {selectedShifts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedShifts.map((shift, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">
                            {shift.person}
                          </p>
                          <p className="text-xs text-slate-500">
                            {shift.start}–{shift.end}
                          </p>
                        </div>
                        {isOwnerMode && (
                          <button
                            onClick={() => removeShift(shift)}
                            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`${shift.person} 근무 지우기`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
              <CardContent className="p-6 text-center">
                <p className="text-xs text-slate-400">
                  달력에서 날짜를 누르면
                  <br />그 날의 근무와 교대를 여기에 보여드려요.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 교대 목록 — 날짜를 골랐으면 그 날짜만, 아니면 이 달 전체 */}
          <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
            <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <CardTitle className="text-base font-extrabold tracking-tight">
                {selectedDate ? "이 날의 교대" : `${month}월 교대`}
              </CardTitle>
              <p className="mt-1 text-xs text-slate-400">
                {isOwnerMode
                  ? "승인 대기 중인 요청을 여기서 처리하세요."
                  : "신청한 교대의 진행 상태를 볼 수 있어요."}
              </p>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              {listedSwaps.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  {selectedDate ? "이 날은 교대 요청이 없어요." : "이 달은 교대 요청이 없어요."}
                </p>
              ) : (
                <div className="space-y-3">
                  {listedSwaps.map((swap) => (
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
        </div>
      </div>

      {showScheduleDialog && (
        <ScheduleDialog
          onSubmit={addRecurring}
          onClose={() => setShowScheduleDialog(false)}
        />
      )}

      {showSwapDialog && (
        <SwapDialog
          defaults={{
            workDate: selectedDate ?? undefined,
            start: selectedShifts[0]?.start,
            end: selectedShifts[0]?.end,
            fromName: selectedShifts[0]?.person,
          }}
          onSubmit={(form) => {
            addSwap(form);
            setShowSwapDialog(false);
          }}
          onClose={() => setShowSwapDialog(false)}
        />
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
  swaps,
  selectedDate,
  quickAdd,
  quickName,
  onSelect,
}: {
  year: number;
  month: number;
  shifts: Shift[];
  swaps: ReturnType<typeof useSwaps>["swaps"];
  selectedDate: string | null;
  /** 빠른 등록이 켜져 있는가 */
  quickAdd: boolean;
  /** 빠른 등록으로 넣을 사람 이름 */
  quickName: string;
  onSelect: (date: string) => void;
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
      <div className="min-w-full">
        <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-[10px] font-semibold text-slate-400 sm:text-[11px]">
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
                  className="min-h-[62px] bg-slate-50/80 sm:min-h-[92px]"
                />
              );
            }

            const workDate = toDateString(year, month, day);
            const isToday = new Date(year, month - 1, day).toDateString() === todayStr;
            const isSelected = workDate === selectedDate;
            const dayShifts = shifts.filter((shift) => shift.workDate === workDate);

            // 이 날에 처리 중인 교대가 있으면 점으로 알려 줍니다
            const hasPendingSwap = swaps.some(
              (swap) =>
                swap.workDate === workDate &&
                (swap.status === "pending_target" || swap.status === "pending_owner")
            );

            // 빠른 등록 중에는 "고른 사람이 이 날 이미 있는지"가 중요합니다.
            const hasMine = dayShifts.some((shift) => shift.person === quickName);

            // 화면을 읽어 주는 기기(스크린리더)와 검사 도구가 칸을 알아볼 수 있게
            // 이름을 붙입니다. 칸 안의 글씨는 너무 짧아 그것만으로는 알기 어렵습니다.
            const shiftNames = dayShifts.map((shift) => shift.person).join(", ");
            const label = quickAdd
              ? `${month}월 ${day}일, ${quickName} 근무 ${hasMine ? "지우기" : "넣기"}`
              : `${month}월 ${day}일` +
                (shiftNames ? `, 근무 ${shiftNames}` : ", 근무 없음") +
                (hasPendingSwap ? ", 처리 중인 교대 있음" : "");

            return (
              <button
                key={day}
                onClick={() => onSelect(workDate)}
                aria-label={label}
                aria-pressed={quickAdd ? hasMine : isSelected}
                className={`min-h-[62px] p-1 text-left transition sm:min-h-[92px] sm:p-2 ${
                  quickAdd
                    ? hasMine
                      ? "bg-blue-50 ring-1 ring-inset ring-blue-400"
                      : "bg-white hover:bg-blue-50/70"
                    : isSelected
                      ? "bg-blue-50 ring-2 ring-inset ring-blue-500"
                      : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold sm:h-6 sm:w-6 sm:text-xs ${
                      isToday ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                  >
                    {day}
                  </span>
                  {hasPendingSwap && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-amber-500"
                      title="처리 중인 교대가 있어요"
                    />
                  )}
                </div>

                {dayShifts.map((shift, i) => (
                  <div
                    key={i}
                    className="mt-1 rounded-md border border-blue-200 bg-blue-50 px-1 py-0.5 text-[9px] leading-tight text-blue-800 sm:mt-1.5 sm:rounded-lg sm:px-1.5 sm:py-1 sm:text-[10px]"
                  >
                    <div className="truncate font-bold">{shift.person}</div>
                    <div className="truncate opacity-75">
                      {shortTime(shift.start, shift.end)}
                    </div>
                  </div>
                ))}
              </button>
            );
          })}
        </div>

        {shifts.length === 0 && (
          <p className="mt-4 text-center text-xs text-slate-400">
            이 달에는 아직 등록된 근무가 없습니다.
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
