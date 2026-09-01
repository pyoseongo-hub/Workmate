import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  CalendarDays,
  FileClock,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useRole } from "@/contexts/RoleContext";

/**
 * 모든 화면이 공통으로 쓰는 껍데기입니다.
 *
 *   ┌──────────── 헤더 (로고 · 알림 · 역할) ────────────┐
 *   │ 사이드   │                                        │
 *   │ 메뉴     │        본문 (화면마다 다름)             │
 *   └──────────┴────────────────────────────────────────┘
 *
 * 화면(페이지)들은 이 안의 "본문" 자리에만 들어갑니다.
 */

/** 사이드바 메뉴 목록. 여기만 고치면 메뉴가 바뀝니다. */
const MENU = [
  { path: "/", label: "대시보드", icon: Sparkles, ownerOnly: false },
  { path: "/schedule", label: "근무표", icon: CalendarDays, ownerOnly: false },
  { path: "/worklog", label: "근무일지", icon: FileClock, ownerOnly: false },
  { path: "/swaps", label: "교대 관리", icon: UsersRound, ownerOnly: false },
  { path: "/staff", label: "직원 관리", icon: UserRound, ownerOnly: true },
];

type Props = {
  /** 화면 맨 위 큰 제목 */
  title: string;
  /** 제목 아래 설명 한 줄 */
  description?: string;
  /** 제목 오른쪽에 놓을 버튼 (있을 때만) */
  action?: ReactNode;
  children: ReactNode;
};

export default function AppLayout({ title, description, action, children }: Props) {
  const [location] = useLocation();
  const { isOwnerMode, exitOwnerMode } = useRole();

  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {/* ───────────────── 헤더 ───────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="메뉴"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-900 text-white shadow-lg shadow-slate-900/15">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-extrabold tracking-[-0.04em]">
                  WorkMate
                </span>
                <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 sm:inline">
                  BETA
                </span>
              </div>
              <p className="text-[11px] text-slate-400">우리 매장 · 성수점</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 역할 배지 — 누르면 모드가 바뀝니다 */}
            <button
              onClick={() => (isOwnerMode ? exitOwnerMode() : setShowPinDialog(true))}
              className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 sm:flex"
            >
              <span
                className={`h-2 w-2 rounded-full ${isOwnerMode ? "bg-amber-500" : "bg-emerald-500"}`}
              />
              {isOwnerMode ? "사장님 모드" : "알바생 모드"}
            </button>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
              aria-label="알림"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {/* ───────────────── 사이드바 ───────────────── */}
        <aside
          className={`${showMenu ? "flex" : "hidden"} fixed inset-y-[72px] left-0 z-20 w-[250px] flex-col border-r border-slate-200 bg-white p-5 lg:sticky lg:top-[72px] lg:flex lg:h-[calc(100vh-72px)] lg:shrink-0`}
        >
          <nav className="space-y-1">
            {MENU.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              const isLocked = item.ownerOnly && !isOwnerMode;

              // 사장님 전용 메뉴인데 알바생 모드면 → 비밀번호 창을 띄웁니다
              if (isLocked) {
                return (
                  <button
                    key={item.path}
                    onClick={() => setShowPinDialog(true)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-400 hover:bg-slate-50"
                  >
                    <Icon className="h-[17px] w-[17px]" />
                    <span>{item.label}</span>
                    <LockKeyhole className="ml-auto h-4 w-4 text-slate-300" />
                  </button>
                );
              }

              return (
                <Link key={item.path} href={item.path}>
                  <button
                    onClick={() => setShowMenu(false)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-100 pt-5">
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-700">안심 기록 정책</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">
                  지난 날짜는 잠기고
                  <br />
                  사장님만 수정할 수 있어요.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ───────────────── 본문 ───────────────── */}
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-7 sm:py-6 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1120px] space-y-4 sm:space-y-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div>
                <h1 className="text-[24px] font-extrabold tracking-[-0.05em] sm:text-[32px] lg:text-[38px]">
                  {title}
                </h1>
                {description && (
                  <p className="mt-1.5 text-[13px] text-slate-500 sm:mt-2 sm:text-sm">
                    {description}
                  </p>
                )}
              </div>
              {action}
            </div>

            {children}
          </div>
        </main>
      </div>

      {showNotifications && (
        <NotificationCenter onClose={() => setShowNotifications(false)} />
      )}

      {showPinDialog && <OwnerPinDialog onClose={() => setShowPinDialog(false)} />}
    </div>
  );
}

/** 사장님 비밀번호 입력 창 */
function OwnerPinDialog({ onClose }: { onClose: () => void }) {
  const { enterOwnerMode } = useRole();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (enterOwnerMode(pin)) {
      onClose();
      return;
    }
    setError("비밀번호가 맞지 않습니다.");
    setPin("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              사장님 인증
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              교대 승인 · 직원 관리 · 지난 기록 수정은 사장님만 할 수 있어요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">
              사장님 비밀번호 (4자리 숫자)
            </span>
            <input
              type="password"
              value={pin}
              maxLength={4}
              inputMode="numeric"
              autoFocus
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && pin.length === 4) submit();
              }}
              className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 text-center text-2xl font-bold tracking-widest outline-none focus:border-blue-500"
              placeholder="••••"
            />
            {error && (
              <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>
            )}
          </label>

          <p className="text-[11px] text-slate-400">기본 비밀번호: 0000</p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl text-sm font-bold"
            >
              취소
            </Button>
            <Button
              onClick={submit}
              disabled={pin.length !== 4}
              className="h-11 flex-1 rounded-xl bg-slate-900 text-sm font-bold hover:bg-slate-800"
            >
              확인
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
