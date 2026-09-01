import { useState } from "react";
import { ChevronLeft, ChevronRight, FileClock, LockKeyhole, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";

/**
 * 근무일지 — 예정 근무와 실제 출퇴근을 나눠서 기록하는 화면입니다.
 *
 * 규칙 (사용자 확정):
 *   · 지난 날짜 기록은 잠깁니다.
 *   · 잠긴 기록은 사장님만 수정할 수 있습니다.
 *
 * TODO(2단계): trpc.workLogs.list 로 실제 기록을 불러옵니다.
 * TODO(2단계): 작성 버튼에 trpc.workLogs.create 를 연결합니다.
 */

/** 근무일지 한 줄 */
type LogRow = {
  id: number;
  workDate: string; // "2026-09-01"
  planned: string; // 예정 근무 "09:00–18:00"
  actual: string | null; // 실제 기록, 없으면 null
  note: string;
  locked: boolean; // 지난 날짜라 잠겼는가
};

export default function WorkLog() {
  const { isOwnerMode } = useRole();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // 아직 연결 전이라 빈 배열입니다.
  const logs: LogRow[] = [];

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
      title="근무일지"
      description="예정 근무와 실제 출퇴근을 나눠서 기록합니다."
      action={
        <Button className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold hover:bg-slate-800">
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
          {logs.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">
              이 달에는 아직 기록이 없습니다. (2단계에서 서버와 연결할 예정입니다)
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <LogItem key={log.id} log={log} canEdit={isOwnerMode || !log.locked} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}

/** 근무일지 목록의 한 줄 */
function LogItem({ log, canEdit }: { log: LogRow; canEdit: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-slate-900">{log.workDate}</p>
          {log.locked && <LockKeyhole className="h-3.5 w-3.5 text-amber-600" />}
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-slate-500">
            예정 <span className="font-semibold text-slate-700">{log.planned}</span>
          </span>
          <span className="text-slate-500">
            실제{" "}
            <span className="font-semibold text-emerald-700">
              {log.actual ?? "기록 없음"}
            </span>
          </span>
        </div>

        {log.note && <p className="mt-1 truncate text-xs text-slate-400">{log.note}</p>}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={!canEdit}
        className="ml-4 shrink-0 gap-1.5 rounded-xl text-xs"
      >
        <PenLine className="h-3.5 w-3.5" />
        수정
      </Button>
    </div>
  );
}
