import { useEffect, useState } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { data: notifications = [] } = trpc.notifications.mine.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "swap_request":
        return "🔄";
      case "swap_confirmed":
        return "✓";
      case "swap_decided":
        return "✓";
      default:
        return "📢";
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "swap_request":
        return "bg-amber-50 border-amber-200";
      case "swap_confirmed":
        return "bg-emerald-50 border-emerald-200";
      case "swap_decided":
        return "bg-emerald-50 border-emerald-200";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-transparent backdrop-blur-sm p-4 pt-[100px]">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">알림</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">알림이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex gap-3 p-4 border-l-4 ${
                    notif.readAt
                      ? "bg-white border-l-slate-200"
                      : "bg-blue-50/30 border-l-blue-400"
                  }`}
                >
                  <div className="text-xl">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {new Date(notif.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
