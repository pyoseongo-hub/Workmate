import { useState } from "react";
import { Check, Copy, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 근무자 초대 카드 — 사장님이 알바생에게 링크를 보내는 곳입니다.
 *
 * 폰에서 "초대하기"를 누르면 카카오톡·문자·메일이 함께 뜨는
 * 공유 창이 열립니다(navigator.share). 카카오 개발자 등록이나
 * 앱 키가 필요 없고, 폰에 깔린 앱이 그대로 나옵니다.
 *
 * PC 브라우저에는 그 공유 창이 없어서, 대신 링크를 복사해 줍니다.
 */
export function InviteCard({ isShared }: { isShared: boolean }) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  // 공유 창은 주로 폰에만 있습니다. PC 브라우저에는 없는 경우가 많습니다.
  // ("share" in navigator) 로 확인합니다 — 타입상 navigator.share 는 항상 있는 것처럼
  // 보이지만 실제로는 없는 브라우저가 많습니다.
  const canShare = "share" in navigator;

  const invite = async () => {
    const url = window.location.href;
    setMessage("");

    // ① 폰: 카카오톡이 들어 있는 공유 창을 엽니다
    if (canShare) {
      try {
        await navigator.share({
          title: "우리 매장 근무표",
          text: "WorkMate 로 근무표와 교대를 확인해 주세요.",
          url,
        });
        return;
      } catch {
        // 사용자가 공유를 취소했거나 이 화면에서는 막혀 있습니다 → ②로 넘어갑니다
      }
    }

    // ② PC: 링크를 복사해 둡니다. 카카오톡에 붙여넣으면 됩니다.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("주소창의 주소를 복사해 카카오톡으로 보내 주세요.");
    }
  };

  return (
    <Card className="rounded-3xl border-0 bg-slate-900 py-0 text-white shadow-lg shadow-slate-900/10">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white/10 p-2 text-blue-300">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-extrabold tracking-tight">근무자 초대</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {isShared
                ? "링크를 받은 사람은 같은 근무표를 봅니다. 사장님이 근무를 고치면 알바생 화면에도 바로 바뀝니다."
                : "지금은 이 기기에만 저장되고 있어요. 초대 링크로 연 화면에서는 모두가 같은 근무표를 봅니다."}
            </p>
          </div>
        </div>

        <Button
          onClick={invite}
          className="mt-5 h-11 w-full gap-2 rounded-xl bg-white text-sm font-bold text-slate-900 hover:bg-slate-100"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              링크를 복사했어요
            </>
          ) : (
            <>
              {canShare ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              카카오톡으로 초대하기
            </>
          )}
        </Button>

        {copied && (
          <p className="mt-3 text-center text-[11px] text-slate-400">
            카카오톡 대화창에 붙여넣기 하세요.
          </p>
        )}
        {message && (
          <p className="mt-3 text-center text-[11px] text-amber-300">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
