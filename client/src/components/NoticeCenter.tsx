import { BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotices } from "@/hooks/useNotices";
import { useRole } from "@/contexts/RoleContext";

/**
 * 알림 목록 — 헤더의 종을 누르면 열립니다.
 *
 * "누가 언제 무엇을 고쳤는지" 를 최근 것부터 보여 줍니다.
 * 창을 열면 읽은 것으로 칩니다.
 */
export function NoticeCenter({ onClose }: { onClose: () => void }) {
  const { myName } = useRole();
  const { notices, unread, markAllRead } = useNotices();

  const close = () => {
    markAllRead();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 backdrop-blur-sm sm:items-start sm:justify-end sm:p-4 sm:pt-[76px]">
      <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[24px]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">알림</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {unread.length > 0
                ? `안 읽은 알림 ${unread.length}개`
                : "새 알림이 없어요"}
            </p>
          </div>
          <button
            onClick={close}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="알림 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {notices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <BellOff className="h-7 w-7 text-slate-300" />
              <p className="text-xs text-slate-400">
                아직 알림이 없습니다.
                <br />
                누가 근무를 고치면 여기에 남습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {notices.map((notice) => {
                // 읽음 표시는 창을 닫을 때 하므로,
                // 열려 있는 동안에는 안 읽은 것에 파란 점이 남아 있습니다.
                const isNew = !notice.readBy.includes(myName);
                return (
                  <div
                    key={notice.id}
                    className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-3.5 py-3"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        isNew ? "bg-blue-500" : "bg-slate-300"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs leading-5 text-slate-700">
                        <b className="font-bold text-slate-900">{notice.who}</b>님이{" "}
                        {notice.text}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatWhen(notice.at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-3">
          <Button
            onClick={close}
            variant="outline"
            className="h-10 w-full rounded-xl text-sm font-bold"
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}

/** "2026-09-01T14:30" → "오늘 14:30" / "9월 1일 14:30" */
function formatWhen(at: string) {
  const [date, time] = at.split("T");
  const today = new Date().toISOString().slice(0, 10);

  if (date === today) return `오늘 ${time}`;

  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일 ${time}`;
}
