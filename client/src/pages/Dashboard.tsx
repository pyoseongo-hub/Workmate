import { Clock3, FileClock, Users, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { useSharedState } from "@/hooks/useSharedState";
import {
  STORAGE_KEYS,
  pad,
  todayString,
  type LogRow,
  type Shift,
  type SwapRow,
} from "@/types";

/**
 * 대시보드 — 오늘 상황을 한눈에 보는 첫 화면입니다.
 *
 * 다른 화면들이 저장해 둔 값을 읽어서 숫자를 계산합니다.
 * 여기서는 값을 고치지 않고 보여주기만 합니다.
 */
export default function Dashboard() {
  const { isOwnerMode } = useRole();

  const [shifts] = useSharedState<Shift[]>(STORAGE_KEYS.shifts, []);
  const [swaps] = useSharedState<SwapRow[]>(STORAGE_KEYS.swaps, []);
  const [logs, , isShared] = useSharedState<LogRow[]>(STORAGE_KEYS.logs, []);

  const today = todayString();
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  // ── 오늘 근무 ─────────────────────────────────────
  const todayShifts = shifts.filter((shift) => shift.workDate === today);

  // ── 확인이 필요한 요청 ────────────────────────────
  // 사장님은 "승인 대기"만, 알바생은 "상대 확인 대기"까지 셉니다.
  const waiting = swaps.filter((swap) =>
    isOwnerMode
      ? swap.status === "pending_owner"
      : swap.status === "pending_target" || swap.status === "pending_owner"
  );

  // ── 이번 달 근무일지 ──────────────────────────────
  const monthShifts = shifts.filter((shift) => shift.workDate.startsWith(monthPrefix));
  const monthLogs = logs.filter((log) => log.workDate.startsWith(monthPrefix));

  return (
    <AppLayout
      title="대시보드"
      description="오늘 근무와 확인이 필요한 일을 모아서 보여드려요."
    >
      {isShared && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-xs leading-5 text-emerald-800">
            <span className="font-bold">여럿이 같이 보는 중이에요.</span> 사장님이 근무표를
            고치면 초대받은 사람 화면에도 바로 바뀝니다.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <SummaryCard
          label="오늘 근무"
          value={todayShifts.length === 0 ? "없음" : `${todayShifts.length}명`}
          hint={
            todayShifts.length === 0
              ? "등록된 근무가 없어요"
              : todayShifts.map((shift) => shift.person).join(" · ")
          }
          icon={<Clock3 className="h-4 w-4" />}
          tone="blue"
        />
        <SummaryCard
          label="확인 필요한 요청"
          value={`${waiting.length}건`}
          hint={
            waiting.length === 0
              ? "처리할 요청이 없어요"
              : isOwnerMode
                ? "승인을 기다리고 있어요"
                : "교대 관리에서 확인하세요"
          }
          icon={<UsersRound className="h-4 w-4" />}
          tone="amber"
        />
        <SummaryCard
          label="이번 달 근무일지"
          value={`${monthLogs.length} / ${monthShifts.length}일`}
          hint={
            monthShifts.length === 0
              ? "근무를 먼저 등록해 주세요"
              : monthLogs.length >= monthShifts.length
                ? "모두 기록했어요"
                : `${monthShifts.length - monthLogs.length}일 남았어요`
          }
          icon={<FileClock className="h-4 w-4" />}
          tone="emerald"
        />
      </div>

      <Card className="rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardContent className="p-5 sm:p-7">
          <p className="text-sm font-bold text-slate-800">오늘의 근무</p>

          {todayShifts.length === 0 ? (
            <p className="mt-4 py-6 text-center text-xs text-slate-400">
              오늘은 등록된 근무가 없습니다.
              <br />
              근무표에서 근무일자를 등록해 보세요.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {todayShifts.map((shift, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-bold text-slate-900">{shift.person}</p>
                  <p className="text-sm font-semibold text-slate-600">
                    {shift.start}–{shift.end}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}

/** 위쪽에 나란히 놓이는 요약 카드 한 장 */
function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "blue" | "amber" | "emerald";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  }[tone];

  return (
    // py-0 : Card 부품에 이미 있는 위아래 여백을 끕니다.
    //        끄지 않으면 아래 p-4 와 겹쳐서 폰에서 카드가 지나치게 커집니다.
    <Card className="rounded-2xl border-0 py-0 shadow-sm shadow-slate-200/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400">{label}</p>
          <div className={`rounded-xl p-2 ${toneClass}`}>{icon}</div>
        </div>
        <p className="mt-2 text-lg font-extrabold tracking-tight sm:mt-3 sm:text-xl">
          {value}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-400 sm:mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
