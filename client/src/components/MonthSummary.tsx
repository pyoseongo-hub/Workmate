import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { personColor, type Member, type Shift } from "@/types";

/**
 * 이 달 근무 합계 — 사람마다 며칠, 몇 시간 일했는지 모아 보여 줍니다.
 *
 * 사장님은 전체 직원을, 알바생은 자기 것만 봅니다.
 * 급여를 셈할 때 쓰는 화면이라 숫자가 어긋나지 않게 조심해서 계산합니다.
 *
 * ⏱️ 쉬는 시간을 빼지 않는 이유 (사장님 방침, 2026-09-01):
 *
 *   근로기준법은 4시간 일하면 30분, 8시간이면 1시간 이상 쉬게 하라고
 *   정해 두었고, 그 시간의 급여는 원칙적으로 무급입니다.
 *   이 매장은 쉬는 시간도 유급으로 쳐서 근무시간에 넣습니다.
 *   법이 정한 것보다 더 주는 것이라 문제가 없습니다.
 *
 *   그래서 근무 자료에 휴게시간 칸을 두지 않았습니다.
 *   방침이 바뀌면 Shift 에 breakMinutes 를 넣고 여기서 빼면 됩니다.
 */

/**
 * 근무 한 건이 몇 시간인가.
 *
 * 밤을 넘기는 근무(22:00~02:00)는 그냥 빼면 음수가 나옵니다.
 * 그럴 때는 24시간을 더해 4시간으로 셉니다.
 */
function hoursOf(shift: Shift) {
  const [startHour, startMin] = shift.start.split(":").map(Number);
  const [endHour, endMin] = shift.end.split(":").map(Number);

  let minutes = endHour * 60 + endMin - (startHour * 60 + startMin);
  if (minutes <= 0) minutes += 24 * 60;

  return minutes / 60;
}

/** 8 → "8", 7.5 → "7.5" (필요할 때만 소수점) */
function niceHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function MonthSummary({
  monthLabel,
  shifts,
  members,
  isOwnerMode,
  myName,
}: {
  /** "9월" 처럼 제목에 쓸 글자 */
  monthLabel: string;
  /** 이 달 근무만 걸러서 넘겨 주세요 */
  shifts: Shift[];
  members: Member[];
  isOwnerMode: boolean;
  myName: string;
}) {
  // 사장님은 전체, 알바생은 자기 것만 봅니다.
  const mine = isOwnerMode ? shifts : shifts.filter((shift) => shift.person === myName);

  // 사람별로 날짜 수와 시간을 모읍니다.
  const byPerson = new Map<string, { days: Set<string>; hours: number }>();
  for (const shift of mine) {
    const found = byPerson.get(shift.person) ?? { days: new Set<string>(), hours: 0 };
    found.days.add(shift.workDate);
    found.hours += hoursOf(shift);
    byPerson.set(shift.person, found);
  }

  // 많이 일한 사람부터 보여 줍니다.
  const rows = Array.from(byPerson.entries())
    .map(([name, value]) => ({ name, days: value.days.size, hours: value.hours }))
    .sort((a, b) => b.hours - a.hours);

  const totalDays = mine.length;
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);

  return (
    <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
      <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-base font-extrabold tracking-tight">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          {monthLabel} 근무 합계
        </CardTitle>
        <p className="mt-1 text-xs text-slate-400">
          {isOwnerMode ? "직원별 일한 날과 시간이에요." : "이 달 내가 일한 시간이에요."}
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            이 달은 등록된 근무가 없어요.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {rows.map((row) => {
                const color = personColor(members, row.name);
                return (
                  <div
                    key={row.name}
                    className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                      {row.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                      {row.days}일
                    </span>
                    <span className="w-[68px] shrink-0 text-right text-sm font-extrabold text-slate-900 tabular-nums">
                      {niceHours(row.hours)}시간
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 여러 명일 때만 합계 줄을 붙입니다. 한 명이면 위 줄과 같아서 군더더기입니다. */}
            {rows.length > 1 && (
              <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5">
                <span className="min-w-0 flex-1 text-sm font-bold text-slate-500">
                  합계
                </span>
                <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                  {totalDays}일
                </span>
                <span className="w-[68px] shrink-0 text-right text-sm font-extrabold text-slate-900 tabular-nums">
                  {niceHours(totalHours)}시간
                </span>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-4 text-slate-400">
              쉬는 시간도 근무시간에 넣은 숫자예요.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
