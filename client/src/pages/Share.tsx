import { CalendarDays, Check, Clock3, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Share() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-900 text-white"><CalendarDays className="h-5 w-5" /></div><div><p className="text-[17px] font-extrabold tracking-[-0.04em]">WorkMate</p><p className="text-[11px] text-slate-400">우리 매장 교대 확인</p></div></div>
        <div className="rounded-[28px] bg-slate-900 p-6 text-white shadow-2xl shadow-slate-900/15 sm:p-8"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" />상대 확인 완료 · 사장님 승인 대기</span><h1 className="mt-5 text-2xl font-extrabold tracking-tight">교대 내용을 확인해 주세요</h1><p className="mt-2 text-sm leading-6 text-slate-400">전화나 카카오톡으로 합의한 내용을 앱에 등록했습니다. 아래 내용을 확인한 뒤 앱에서 응답해 주세요.</p><div className="mt-7 rounded-2xl bg-white/10 p-5"><div className="flex items-center gap-3 text-blue-200"><Clock3 className="h-5 w-5" /><span className="text-sm font-bold">8월 15일 금요일 · 14:00–20:00</span></div><div className="my-5 h-px bg-white/10" /><div className="flex items-center justify-between"><div><p className="text-xs text-slate-400">기존 근무자</p><p className="mt-1 text-lg font-extrabold">김민수</p></div><div className="text-xl text-slate-500">→</div><div className="text-right"><p className="text-xs text-slate-400">교대 근무자</p><p className="mt-1 text-lg font-extrabold">이서연</p></div></div></div><div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><UsersRound className="h-4 w-4" />홀 서빙 · 휴게 30분 · 앱에서 최종 승인</div></div>
        <div className="mt-4 grid grid-cols-2 gap-3"><Button className="h-12 rounded-2xl bg-slate-900 text-sm font-bold hover:bg-slate-800"><Check className="mr-2 h-4 w-4" />내용 확인</Button><Button variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50">거절하기</Button></div>
        <p className="mt-7 text-center text-xs leading-5 text-slate-400">이 링크는 교대 내용을 확인하기 위한 공유 페이지입니다.<br />최종 확정은 사장님 승인 후 근무표에 반영됩니다.</p>
      </div>
    </div>
  );
}
