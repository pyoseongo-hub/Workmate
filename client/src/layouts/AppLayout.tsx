import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  CalendarDays,
  Eye,
  FileClock,
  LockKeyhole,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
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
  const { myName, isOwner, isOwnerMode, viewAsStaff, toggleViewAsStaff, logout } =
    useRole();

  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

          <div className="flex items-center gap-1 sm:gap-3">
            {/* 내 이름 — 누르면 화면 바꾸기·나가기가 나옵니다 */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${isOwnerMode ? "bg-amber-500" : "bg-emerald-500"}`}
                />
                <span className="max-w-[70px] truncate sm:max-w-none">{myName}</span>
                {isOwnerMode && <span className="hidden sm:inline">· 사장님</span>}
              </button>

              {showUserMenu && (
                <>
                  {/* 바깥을 누르면 닫힙니다 */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                    aria-hidden
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                    <div className="px-3 py-2">
                      <p className="text-sm font-bold text-slate-900">{myName}</p>
                      <p className="text-[11px] text-slate-400">
                        {isOwner ? "사장님" : "직원"}
                      </p>
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => {
                          toggleViewAsStaff();
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        {viewAsStaff ? "사장님 화면으로" : "알바생 화면으로 보기"}
                      </button>
                    )}

                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      나가기
                    </button>
                  </div>
                </>
              )}
            </div>

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

      {/* 폰에서 메뉴를 열면 뒤를 어둡게 덮습니다. 눌러서 닫을 수 있습니다. */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          className="fixed inset-0 top-[72px] z-10 bg-slate-950/30 lg:hidden"
          aria-hidden
        />
      )}

      <div className="mx-auto flex max-w-[1440px]">
        {/* ───────────────── 사이드바 ───────────────── */}
        <aside
          className={`${showMenu ? "flex" : "hidden"} fixed inset-y-[72px] left-0 z-20 w-[250px] flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 lg:sticky lg:top-[72px] lg:flex lg:h-[calc(100vh-72px)] lg:shrink-0`}
        >
          <nav className="space-y-1">
            {MENU.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              const isLocked = item.ownerOnly && !isOwnerMode;

              // 사장님 전용 메뉴는 알바생에게 잠긴 채로 보여 줍니다.
              // 있다는 건 알되 열 수는 없습니다.
              if (isLocked) {
                return (
                  <div
                    key={item.path}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300"
                    title="사장님만 볼 수 있어요"
                  >
                    <Icon className="h-[17px] w-[17px]" />
                    <span>{item.label}</span>
                    <LockKeyhole className="ml-auto h-4 w-4" />
                  </div>
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
    </div>
  );
}
