import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";

/**
 * 근무표 — 한 달 달력에 누가 언제 일하는지 보여주는 화면입니다.
 *
 * TODO(2단계): trpc.schedules.list 로 실제 근무를 불러옵니다.
 * TODO(2단계): "근무일자 등록" 버튼에 trpc.schedules.recurringAdd 를 연결합니다.
 */

/** 달력에 그릴 근무 한 칸 */
type Shift = {
  day: number;
  person: string;
  time: string;
};

export default function Schedule() {
  const { isOwnerMode } = useRole();

  // 지금 보고 있는 연·월
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1~12

  // 아직 연결 전이라 빈 배열입니다. 2단계에서 서버 데이터가 들어옵니다.
  const shifts: Shift[] = [];

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

  return (
    <AppLayout
      title="근무표"
      description="기본 근무일자와 확정된 교대 내용을 한눈에 확인하세요."
      action={
        isOwnerMode && (
          <Button className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            근무일자 등록
          </Button>
        )
      }
    >
      <Card className="overflow-hidden rounded-3xl border-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
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

        <CardContent className="p-4 sm:p-7">
          <CalendarGrid year={year} month={month} shifts={shifts} />
        </CardContent>
      </Card>
    </AppLayout>
  );
}

/**
 * 달력 그리드.
 *
 * 지난 코드는 무조건 35칸을 그렸는데, 그러면 달마다 날짜가 어긋납니다.
 * 여기서는 그 달의 1일이 무슨 요일인지 계산해서 앞을 비웁니다.
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
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  // 이 달 1일의 요일 (0=일요일)
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  // 이 달의 마지막 날짜 (28~31)
  const lastDay = new Date(year, month, 0).getDate();

  // 앞쪽 빈 칸 + 실제 날짜
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];

  const todayStr = new Date().toDateString();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-slate-100">
          {cells.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-[108px] bg-slate-50/80" />;
            }

            const isToday = new Date(year, month - 1, day).toDateString() === todayStr;
            const shift = shifts.find((item) => item.day === day);

            return (
              <div
                key={day}
                className="min-h-[108px] bg-white p-2.5 transition-colors hover:bg-slate-50"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  {day}
                </span>

                {shift && (
                  <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-[11px] leading-tight text-blue-800">
                    <div className="font-bold">{shift.person}</div>
                    <div className="mt-1 opacity-75">{shift.time}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {shifts.length === 0 && (
          <p className="mt-5 text-center text-xs text-slate-400">
            아직 등록된 근무가 없습니다. (2단계에서 서버와 연결할 예정입니다)
          </p>
        )}
      </div>
    </div>
  );
}
