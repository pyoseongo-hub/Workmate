import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileClock,
  Filter,
  LockKeyhole,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const staff = [
  { name: "서연", role: "오픈 담당", color: "bg-blue-100 text-blue-700" },
  { name: "민수", role: "미들 담당", color: "bg-violet-100 text-violet-700" },
  { name: "수빈", role: "마감 담당", color: "bg-amber-100 text-amber-700" },
  { name: "지민", role: "주말 지원", color: "bg-emerald-100 text-emerald-700" },
];

type CalendarShift = { day: number; person: string; time: string; tone: string; status?: string };

const shifts: CalendarShift[] = [
  { day: 1, person: "서연", time: "09:00–18:00", tone: "blue" },
  { day: 2, person: "민수", time: "12:00–21:00", tone: "violet" },
  { day: 3, person: "수빈", time: "14:00–22:00", tone: "amber" },
  { day: 5, person: "서연", time: "09:00–18:00", tone: "blue" },
  { day: 6, person: "지민", time: "11:00–19:00", tone: "green" },
  { day: 8, person: "민수", time: "12:00–21:00", tone: "violet" },
  { day: 9, person: "수빈", time: "14:00–22:00", tone: "amber" },
  { day: 12, person: "서연", time: "09:00–18:00", tone: "blue" },
  { day: 13, person: "민수", time: "12:00–21:00", tone: "violet" },
  { day: 14, person: "수빈", time: "14:00–22:00", tone: "amber" },
  { day: 15, person: "서연", time: "09:00–18:00", tone: "blue" },
  { day: 16, person: "지민", time: "11:00–19:00", tone: "green" },
  { day: 19, person: "민수", time: "12:00–21:00", tone: "violet" },
  { day: 20, person: "수빈", time: "14:00–22:00", tone: "amber" },
  { day: 22, person: "서연", time: "09:00–18:00", tone: "blue" },
  { day: 23, person: "민수", time: "12:00–21:00", tone: "violet" },
  { day: 26, person: "수빈", time: "14:00–22:00", tone: "amber" },
  { day: 27, person: "지민", time: "11:00–19:00", tone: "green" },
];

const toneMap: Record<string, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

function CalendarGrid({ owner, calendarShifts = shifts }: { owner: boolean; calendarShifts?: CalendarShift[] }) {
  const days = Array.from({ length: 35 }, (_, index) => index - 4);
  return (
    <div className="mt-5 overflow-x-auto">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-slate-100 mt-2">
          {days.map((day, index) => {
            const active = day > 0 && day <= 31;
            const current = day === 12;
            const item = calendarShifts.find((shift) => shift.day === day);
            const holiday = item?.status === "holiday" || day === 17;
            return (
              <div key={`${day}-${index}`} className={`min-h-[108px] bg-white p-2.5 transition-colors ${active ? 'hover:bg-slate-50' : 'bg-slate-50/80'}`}>
                <div className="flex items-center justify-between">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${current ? 'bg-slate-900 text-white' : active ? 'text-slate-600' : 'text-slate-300'}`}>{active ? day : day < 1 ? 28 + day : day - 31}</span>
                  {holiday && <span className="text-[10px] font-medium text-rose-500">휴무</span>}
                </div>
                {item && <div className={`mt-2 rounded-xl border px-2 py-2 text-[11px] leading-tight ${toneMap[item.tone]}`}><div className="font-bold">{item.person}</div><div className="mt-1 opacity-75">{item.time}</div></div>}
                {item?.status === "swapped" && <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-semibold text-emerald-700">교대 확정</div>}{owner && day === 15 && !item?.status && <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-700">교대 승인 대기</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdSlot() {
  return <div className="ad-slot hidden min-h-[78px] items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 md:flex"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Partner space</p><p className="mt-1 text-sm font-medium text-slate-500">매장 운영에 도움이 되는 소식과 혜택을 만나보세요.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-400">광고 영역</span></div>;
}

export default function Home() {
  const [owner, setOwner] = useState(true);
  const [month, setMonth] = useState("2026년 8월");
  const { user } = useAuth();
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: Boolean(user), retry: false, refetchOnWindowFocus: false });
  const { data: workspace } = trpc.workspaces.mine.useQuery(undefined, { enabled: Boolean(user), retry: false, refetchOnWindowFocus: false });
  const { data: members = [] } = trpc.members.list.useQuery({ workspaceId: workspace?.id ?? 0 }, { enabled: Boolean(workspace?.id), retry: false, refetchOnWindowFocus: false });
  const selectedMonth = month.includes("7월") ? 7 : month.includes("9월") ? 9 : 8;
  const { data: liveShifts } = trpc.schedules.list.useQuery({ workspaceId: workspace?.id ?? 0, year: 2026, month: selectedMonth }, { enabled: Boolean(workspace?.id), retry: false, refetchOnWindowFocus: false });
  const { data: pendingSwaps = [] } = trpc.swaps.pending.useQuery({ workspaceId: workspace?.id ?? 0 }, { enabled: Boolean(workspace?.id), retry: false, refetchOnWindowFocus: false });
  const decideSwap = trpc.swaps.decide.useMutation();
  const confirmSwap = trpc.swaps.confirm.useMutation();
  useEffect(() => {
    if (user) setOwner(user.role === "admin");
  }, [user]);
  const [active, setActive] = useState("근무표");
  const [shiftStatus, setShiftStatus] = useState<"대기" | "확정" | "반려">("대기");
  const [notice, setNotice] = useState("이번 주 교대 요청이 도착했어요.");
  const [showMenu, setShowMenu] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);

  const roleLabel = owner ? "사장님 모드" : "알바생 모드";
  const navItems = owner ? ["대시보드", "근무표", "근무일지", "교대 승인", "직원 관리"] : ["오늘 근무", "내 근무표", "근무일지", "교대 요청"];
  const pendingCount = user ? (unreadCount ?? 0) : (shiftStatus === "대기" ? 1 : 0);
  const memberNameById = useMemo(() => Object.fromEntries(members.map((member) => [member.id, member.displayName])), [members]);
  const calendarShifts = useMemo<CalendarShift[]>(() => liveShifts?.length ? liveShifts.map((shift, index) => ({ day: Number(shift.workDate.slice(-2)), person: memberNameById[shift.memberId] ?? `직원 ${shift.memberId}`, time: `${shift.startTime}–${shift.endTime}`, tone: ['blue', 'violet', 'amber', 'green'][index % 4], status: shift.status })) : shifts, [liveShifts, memberNameById]);
  const todayShift = useMemo(() => owner ? "매장 전체 4명" : "09:00–18:00 · 홀 서빙", [owner]);

  const approve = async () => { try { if (workspace?.id && pendingSwaps[0]) await decideSwap.mutateAsync({ id: pendingSwaps[0].id, workspaceId: workspace.id, approved: true }); setShiftStatus("확정"); setNotice("교대가 확정되었습니다. 양쪽 근무표에 반영했어요."); } catch (caught) { setNotice(caught instanceof Error ? caught.message : "교대 승인에 실패했습니다."); } };
  const reject = async () => { try { if (workspace?.id && pendingSwaps[0]) await decideSwap.mutateAsync({ id: pendingSwaps[0].id, workspaceId: workspace.id, approved: false }); setShiftStatus("반려"); setNotice("교대 요청을 반려했습니다. 기존 근무표를 유지합니다."); } catch (caught) { setNotice(caught instanceof Error ? caught.message : "교대 반려에 실패했습니다."); } };
  const confirmEmployeeSwap = async () => { try { if (workspace?.id && pendingSwaps[0]) await confirmSwap.mutateAsync({ id: pendingSwaps[0].id, workspaceId: workspace.id, confirmed: true }); setNotice("교대 확인을 완료했습니다. 사장님 승인 대기 중입니다."); } catch (caught) { setNotice(caught instanceof Error ? caught.message : "교대 확인에 실패했습니다."); } };
  const share = async () => {
    const shareUrl = `${window.location.origin}/share/shift-8-15`;
    const shareData = { title: "우리 매장 교대 확인", text: "8월 15일 교대 내용을 앱에서 확인해 주세요.", url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard?.writeText(shareUrl);
      }
      setNotice("공유 링크를 준비했습니다. 카카오톡에서 전달할 수 있어요.");
    } catch {
      setNotice("공유를 취소했어요. 앱에서 교대 상태를 계속 확인할 수 있습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3"><button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setShowMenu(!showMenu)} aria-label="메뉴"><Menu className="h-5 w-5" /></button><div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-900 text-white shadow-lg shadow-slate-900/15"><CalendarDays className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><span className="text-[17px] font-extrabold tracking-[-0.04em]">WorkMate</span><span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 sm:inline">BETA</span></div><p className="text-[11px] text-slate-400">우리 매장 · 성수점</p></div></div>
          <div className="flex items-center gap-2 sm:gap-3"><button className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:flex" onClick={() => setOwner(!owner)}><span className="h-2 w-2 rounded-full bg-emerald-500" />{roleLabel}<ChevronRight className="h-3.5 w-3.5" /></button><button className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" aria-label="알림"><Bell className="h-[18px] w-[18px]" />{pendingCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}</button><div className="hidden h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 sm:flex">{owner ? '김' : '서'}</div></div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px]">
        <aside className={`${showMenu ? 'flex' : 'hidden'} fixed inset-y-[72px] left-0 z-20 w-[250px] flex-col border-r border-slate-200 bg-white p-5 lg:sticky lg:top-[72px] lg:flex lg:h-[calc(100vh-72px)] lg:shrink-0`}>
          <div className="mb-7 rounded-2xl bg-slate-900 p-4 text-white"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-300">이번 달 근무</span><MoreHorizontal className="h-4 w-4 text-slate-400" /></div><p className="mt-3 text-2xl font-extrabold tracking-tight">{owner ? '120시간' : '24시간'}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[68%] rounded-full bg-blue-400" /></div><p className="mt-2 text-[11px] text-slate-400">목표 대비 68% 진행</p></div>
          <nav className="space-y-1">{navItems.map((item, index) => <button key={item} onClick={() => { setActive(item); setShowMenu(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active === item || (active === '대시보드' && index === 0) ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>{index === 0 ? <Sparkles className="h-[17px] w-[17px]" /> : index === 1 ? <CalendarDays className="h-[17px] w-[17px]" /> : index === 2 ? <FileClock className="h-[17px] w-[17px]" /> : index === 3 ? <UsersRound className="h-[17px] w-[17px]" /> : <UserRound className="h-[17px] w-[17px]" />}<span>{item}</span>{item === '교대 승인' && pendingCount > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-white">{pendingCount}</span>}</button>)}</nav>
          <div className="mt-auto border-t border-slate-100 pt-5"><div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" /><div><p className="text-xs font-bold text-slate-700">안심 기록 정책</p><p className="mt-1 text-[11px] leading-4 text-slate-400">지난 날짜는 잠기고<br />사장님만 수정할 수 있어요.</p></div></div><button className="mt-4 flex w-full items-center gap-3 px-3 text-sm font-medium text-slate-400 hover:text-slate-700"><MessageCircle className="h-4 w-4" />도움말 및 문의</button></div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1120px] space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-blue-600">좋은 아침이에요, {owner ? '사장님' : '서연님'}</p><h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.06em] sm:text-[38px]">{active === '근무표' || active === '내 근무표' ? '이번 달 근무표' : active}</h1><p className="mt-2 text-sm text-slate-500">기본 근무일자와 확정된 교대 내용을 한눈에 확인하세요.</p></div><div className="flex items-center gap-2"><Button variant="outline" className="h-10 gap-2 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-sm" onClick={() => setOwner(!owner)}><UsersRound className="h-4 w-4" />{owner ? '알바생 화면 보기' : '사장님 화면 보기'}</Button>{owner && <Button onClick={() => setShowScheduleDialog(true)} className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold shadow-lg shadow-slate-900/15 hover:bg-slate-800"><Plus className="h-4 w-4" />근무일자 등록</Button>}</div></div>
            <div className="grid gap-4 sm:grid-cols-3"><Card className="rounded-2xl border-0 shadow-sm shadow-slate-200/60"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-400">오늘 근무</p><div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Clock3 className="h-4 w-4" /></div></div><p className="mt-3 text-xl font-extrabold tracking-tight">{todayShift}</p><p className="mt-1 text-xs text-slate-400">{owner ? '현재 출근 3명 · 확인 필요 1명' : '기본 근무일자 기준'}</p></CardContent></Card><Card className="rounded-2xl border-0 shadow-sm shadow-slate-200/60"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-400">확인 필요한 요청</p><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><UsersRound className="h-4 w-4" /></div></div><p className="mt-3 text-xl font-extrabold tracking-tight">{pendingCount}건</p><p className="mt-1 text-xs text-slate-400">{shiftStatus === '대기' ? '8월 15일 교대 신청' : '처리 완료'}</p></CardContent></Card><Card className="rounded-2xl border-0 shadow-sm shadow-slate-200/60"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-400">이번 달 근무일지</p><div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><FileClock className="h-4 w-4" /></div></div><p className="mt-3 text-xl font-extrabold tracking-tight">18 / 24일</p><p className="mt-1 text-xs text-emerald-600">정상 기록 17일 · 확인 1일</p></CardContent></Card></div>
            <AdSlot />
            <Card className="overflow-hidden rounded-3xl border-0 shadow-sm shadow-slate-200/60"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><CardTitle className="text-lg font-extrabold tracking-tight">{month}</CardTitle><p className="mt-1 text-xs text-slate-400">{owner ? '전체 직원 · 기본 근무일자 기준' : '내 근무일과 확정 교대'}</p></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200" onClick={() => setMonth('2026년 7월')}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200" onClick={() => setMonth('2026년 9월')}><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" className="hidden h-9 gap-2 rounded-xl border-slate-200 text-xs font-semibold sm:flex"><Filter className="h-3.5 w-3.5" />필터</Button></div></CardHeader><CardContent className="p-4 sm:p-7"><div className="flex flex-wrap items-center gap-2">{staff.map((person) => <span key={person.name} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${person.color}`}>{person.name} · {person.role}</span>)}<span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500">회색 · 휴무</span></div><CalendarGrid owner={owner} calendarShifts={calendarShifts} /></CardContent></Card>
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="rounded-3xl border-0 shadow-sm shadow-slate-200/60"><CardHeader className="flex flex-row items-center justify-between px-5 py-5 sm:px-7"><div><CardTitle className="text-lg font-extrabold tracking-tight">교대 확인 센터</CardTitle><p className="mt-1 text-xs text-slate-400">전화·카톡으로 합의한 내용은 앱에서 최종 확정해요.</p></div><Badge className={`${shiftStatus === '확정' ? 'bg-emerald-50 text-emerald-700' : shiftStatus === '반려' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'} border-0`}>{shiftStatus === '대기' ? '승인 대기' : shiftStatus}</Badge></CardHeader><CardContent className="px-5 pb-6 sm:px-7"><div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-slate-800">8월 15일 금요일 · 14:00–20:00</p><p className="mt-1 text-xs text-slate-500">김민수 <span className="mx-1 text-slate-300">→</span> 이서연 · 홀 서빙</p></div><button className="rounded-lg p-1.5 text-slate-400 hover:bg-white"><MoreHorizontal className="h-4 w-4" /></button></div><div className="mt-5 flex items-center justify-between gap-1"><div className="flex flex-col items-center gap-2 text-center"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-4 w-4" /></span><span className="text-[10px] font-semibold text-slate-500">알바생 합의</span></div><div className="h-px flex-1 bg-emerald-200" /><div className="flex flex-col items-center gap-2 text-center"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-4 w-4" /></span><span className="text-[10px] font-semibold text-slate-500">상대 확인</span></div><div className="h-px flex-1 bg-slate-200" /><div className="flex flex-col items-center gap-2 text-center"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${shiftStatus === '확정' ? 'bg-emerald-500 text-white' : shiftStatus === '반려' ? 'bg-rose-500 text-white' : 'border-2 border-amber-400 bg-white text-amber-500'}`}>{shiftStatus === '확정' ? <Check className="h-4 w-4" /> : shiftStatus === '반려' ? <X className="h-4 w-4" /> : '3'}</span><span className="text-[10px] font-semibold text-slate-500">사장님 승인</span></div></div></div>{owner ? <div className="mt-4 flex flex-wrap gap-2"><Button onClick={approve} disabled={shiftStatus !== '대기' || decideSwap.isPending} className="h-10 flex-1 rounded-xl bg-slate-900 text-xs font-bold hover:bg-slate-800"><Check className="mr-1.5 h-4 w-4" />승인</Button><Button onClick={reject} disabled={shiftStatus !== '대기' || decideSwap.isPending} variant="outline" className="h-10 flex-1 rounded-xl border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"><X className="mr-1.5 h-4 w-4" />반려</Button><Button onClick={share} variant="outline" className="h-10 w-full rounded-xl border-slate-200 text-xs font-bold sm:w-auto"><Send className="mr-1.5 h-4 w-4" />카톡 링크 공유</Button></div> : <div className="mt-4 flex gap-2"><Button onClick={confirmEmployeeSwap} disabled={confirmSwap.isPending} className="h-10 flex-1 rounded-xl bg-slate-900 text-xs font-bold"><Check className="mr-1.5 h-4 w-4" />내용 확인</Button><Button onClick={() => setNotice('교대 요청을 거절했습니다.')} variant="outline" className="h-10 flex-1 rounded-xl text-xs font-bold">거절</Button></div>}</CardContent></Card>
              <Card className="rounded-3xl border-0 bg-slate-900 text-white shadow-xl shadow-slate-900/10"><CardHeader className="px-5 pb-2 pt-5 sm:px-7"><div className="flex items-start justify-between"><div><CardTitle className="text-lg font-extrabold tracking-tight text-white">오늘의 근무일지</CardTitle><p className="mt-1 text-xs text-slate-400">예정 근무와 실제 기록을 분리해요.</p></div><div className="rounded-xl bg-white/10 p-2 text-blue-300"><FileClock className="h-4 w-4" /></div></div></CardHeader><CardContent className="px-5 pb-6 sm:px-7"><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-[11px] text-slate-400">예정 근무</p><p className="mt-2 text-lg font-extrabold">09:00–18:00</p><p className="mt-1 text-[11px] text-blue-300">기본 근무일자</p></div><div className="rounded-2xl bg-emerald-400/10 p-4"><p className="text-[11px] text-slate-400">실제 기록</p><p className="mt-2 text-lg font-extrabold">09:03–18:02</p><p className="mt-1 text-[11px] text-emerald-300">정상 반영</p></div></div><div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3"><LockKeyhole className="h-4 w-4 text-amber-300" /><p className="text-[11px] leading-4 text-slate-300">지난 날짜 기록은 잠겨 있어요.<br /><span className="text-slate-500">사장님만 수정할 수 있습니다.</span></p><button className="ml-auto text-slate-500 hover:text-white" aria-label="일지 수정"><PenLine className="h-4 w-4" /></button></div><Button onClick={() => setShowLogDialog(true)} variant="outline" className="mt-4 h-10 w-full rounded-xl border-white/15 bg-white/5 text-xs font-bold text-white hover:bg-white/10"><FileClock className="mr-1.5 h-4 w-4" />근무일지 작성하기</Button></CardContent></Card>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-700"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><span className="font-semibold">모든 확정 변경은 기록으로 남습니다.</span><span className="hidden text-blue-500 sm:inline">수정자 · 수정 시각 · 변경 전후 내용을 확인할 수 있어요.</span></div><button className="font-bold underline underline-offset-4" onClick={() => setNotice('변경 이력 화면을 준비했습니다.')}>이력 보기</button></div>
            {showScheduleDialog && <ScheduleDialog workspaceId={workspace?.id} year={2026} month={selectedMonth} members={members} onClose={() => setShowScheduleDialog(false)} onSaved={() => { setShowScheduleDialog(false); setNotice('기본 근무일자를 저장했습니다. 다음 달력 생성에 반영됩니다.'); }} />}
            {showLogDialog && <LogDialog workspaceId={workspace?.id} shift={liveShifts?.[0]} onClose={() => setShowLogDialog(false)} onSaved={() => { setShowLogDialog(false); setNotice('오늘의 근무일지를 저장했습니다.'); }} />}
            {notice && <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl"><Check className="h-4 w-4 text-emerald-300" />{notice}<button onClick={() => setNotice('')} className="text-slate-400 hover:text-white" aria-label="알림 닫기"><X className="h-3.5 w-3.5" /></button></div>}
          </div>
        </main>
      </div>
    </div>
  );
}


type DialogProps = { onClose: () => void; onSaved: () => void };
type ScheduleDialogProps = DialogProps & { workspaceId?: number; year: number; month: number; members: Array<{ id: number; displayName: string; memberRole: "owner" | "staff" }> };
type LogDialogProps = DialogProps & { workspaceId?: number; shift?: { id: number; memberId: number; workDate: string } };

function DialogShell({ title, description, children, onClose }: { title: string; description: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div className="w-full max-w-md rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px]"><div className="flex items-start justify-between"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="닫기"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}

function ScheduleDialog({ onClose, onSaved, workspaceId, year, month, members }: ScheduleDialogProps) {
  const recurringMutation = trpc.schedules.recurringAdd.useMutation();
  const generateMutation = trpc.schedules.generateMonth.useMutation();
  const utils = trpc.useUtils();
  const [person, setPerson] = useState("서연");
  const [days, setDays] = useState("월 · 수 · 금");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [breakTime, setBreakTime] = useState("30");
  const [error, setError] = useState("");
  const saveSchedule = async () => {
    setError("");
    if (!workspaceId) { setError("로그인 후 매장을 선택하면 실제로 저장할 수 있습니다."); return; }
    const member = members.find((item) => item.displayName === person);
    if (!member) { setError("등록된 매장 직원이 없습니다. 직원 관리에서 먼저 초대해 주세요."); return; }
    try {
      const weekdayMap: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
      const weekdayValues = days.split("").filter((char) => weekdayMap[char] !== undefined).map((char) => weekdayMap[char]);
      const selectedWeekdays = weekdayValues.length ? Array.from(new Set(weekdayValues)) : [1];
      await Promise.all(selectedWeekdays.map((weekday) => recurringMutation.mutateAsync({ workspaceId, memberId: member.id, weekday, startTime: start, endTime: end, breakMinutes: Number(breakTime), effectiveFrom: new Date().toISOString().slice(0, 10) })));
      await generateMutation.mutateAsync({ workspaceId, year, month });
      await utils.schedules.list.invalidate({ workspaceId, year, month });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };
  return <DialogShell title="기본 근무일자 등록" description="반복되는 근무 패턴을 저장하면 월간 근무표를 만들 때 기준으로 사용할 수 있어요." onClose={onClose}><div className="mt-6 space-y-4"><label className="block"><span className="text-xs font-bold text-slate-600">직원</span><select value={person} onChange={(event) => setPerson(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500">{(members.length ? members.map((item) => item.displayName) : ['서연', '민수', '수빈', '지민']).map((name) => <option key={name}>{name}</option>)}</select></label><label className="block"><span className="text-xs font-bold text-slate-600">반복 요일</span><input value={days} onChange={(event) => setDays(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" /></label><div className="grid grid-cols-3 gap-3"><label><span className="text-xs font-bold text-slate-600">시작</span><input value={start} onChange={(event) => setStart(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label><label><span className="text-xs font-bold text-slate-600">종료</span><input value={end} onChange={(event) => setEnd(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label><label><span className="text-xs font-bold text-slate-600">휴게(분)</span><input value={breakTime} onChange={(event) => setBreakTime(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label></div>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-600">{error}</p>}<div className="flex gap-2 pt-2"><Button variant="outline" onClick={onClose} className="h-11 flex-1 rounded-xl text-sm font-bold">취소</Button><Button onClick={saveSchedule} disabled={recurringMutation.isPending || generateMutation.isPending} className="h-11 flex-1 rounded-xl bg-slate-900 text-sm font-bold hover:bg-slate-800">{recurringMutation.isPending || generateMutation.isPending ? '저장 중...' : '저장하기'}</Button></div></div></DialogShell>;
}

function LogDialog({ onClose, onSaved, workspaceId, shift }: LogDialogProps) {
  const logMutation = trpc.workLogs.create.useMutation();
  const [note, setNote] = useState("");
  const saveLog = async () => {
    if (workspaceId && shift) {
      await logMutation.mutateAsync({ workspaceId, shiftId: shift.id, memberId: shift.memberId, workDate: shift.workDate, clockInAt: new Date(), clockOutAt: new Date(), note });
    }
    onSaved();
  };
  return <DialogShell title="오늘의 근무일지" description="예정 근무와 실제 출퇴근을 확인하고 특이사항을 남겨주세요." onClose={onClose}><div className="mt-6 space-y-4"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] font-semibold text-slate-400">예정 근무</p><p className="mt-2 text-lg font-extrabold text-slate-900">09:00–18:00</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[11px] font-semibold text-emerald-600">실제 기록</p><p className="mt-2 text-lg font-extrabold text-emerald-800">09:03–18:02</p></div></div><label className="block"><span className="text-xs font-bold text-slate-600">특이사항</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="대체 근무, 지각 사유, 매장 이슈 등을 적어주세요." className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" /></label><div className="flex gap-2 pt-2"><Button variant="outline" onClick={onClose} className="h-11 flex-1 rounded-xl text-sm font-bold">취소</Button><Button onClick={saveLog} disabled={logMutation.isPending} className="h-11 flex-1 rounded-xl bg-slate-900 text-sm font-bold hover:bg-slate-800">{logMutation.isPending ? '저장 중...' : '일지 저장'}</Button></div></div></DialogShell>;
}
