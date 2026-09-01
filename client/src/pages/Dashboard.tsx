import { Clock3, FileClock, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";

/**
 * 대시보드 — 오늘 상황을 한눈에 보는 첫 화면입니다.
 *
 * TODO(2단계): 아래 숫자들을 실제 DB 값으로 바꿉니다.
 *   오늘 근무   ← trpc.schedules.list
 *   확인 필요   ← trpc.swaps.pending
 *   근무일지    ← trpc.workLogs.list
 */
export default function Dashboard() {
  const { isOwnerMode } = useRole();

  return (
    <AppLayout
      title="대시보드"
      description="오늘 근무와 확인이 필요한 일을 모아서 보여드려요."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="오늘 근무"
          value={isOwnerMode ? "—명" : "—"}
          hint="아직 연결 전입니다"
          icon={<Clock3 className="h-4 w-4" />}
          tone="blue"
        />
        <SummaryCard
          label="확인 필요한 요청"
          value="—건"
          hint="아직 연결 전입니다"
          icon={<UsersRound className="h-4 w-4" />}
          tone="amber"
        />
        <SummaryCard
          label="이번 달 근무일지"
          value="— / —일"
          hint="아직 연결 전입니다"
          icon={<FileClock className="h-4 w-4" />}
          tone="emerald"
        />
      </div>

      <Card className="rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardContent className="p-6 text-center sm:p-8">
          <p className="text-sm font-semibold text-slate-500">
            여기에 오늘의 근무 요약이 들어갑니다.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            2단계에서 실제 데이터를 연결할 예정입니다.
          </p>
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
        <p className="mt-0.5 text-xs text-slate-400 sm:mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
