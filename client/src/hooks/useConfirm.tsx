import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * "정말 지울까요?" 를 묻는 확인 창.
 *
 * 🚨 왜 만들었나 (2026-09-01, 사용자가 화면으로 짚어 줌: "삭제 안됨")
 *
 *   원래는 브라우저가 주는 confirm() 창을 썼습니다. PC 에서는 잘 됐습니다.
 *   그런데 앱을 안전 상자(iframe sandbox) 안에서 열면 —
 *   미리보기 화면이 그렇습니다 — 브라우저가 그 창을 아예 띄우지 않습니다.
 *
 *   문제는 "안 뜬다" 로 끝나지 않는다는 것입니다.
 *   confirm() 은 창을 못 띄우면 조용히 false(=취소) 를 돌려줍니다.
 *   그래서 코드는 "사용자가 취소했구나" 하고 넘어가고,
 *   화면에는 아무 일도 안 일어납니다. 오류 한 줄도 안 뜹니다.
 *   지우기·교대 취소·근무일지 삭제·직원 삭제가 전부 이래서 먹통이었습니다.
 *
 *   그래서 창을 앱이 직접 그립니다. 브라우저에 기대지 않으면 어디서나 됩니다.
 *
 * 쓰는 법 — 물어볼 화면에서:
 *
 *   const { ask, confirmDialog } = useConfirm();
 *   ...
 *   const remove = async () => {
 *     if (!(await ask("9월 14일 근무를 지울까요?"))) return;
 *     ...실제로 지우는 코드...
 *   };
 *   ...
 *   return (<>...화면...{confirmDialog}</>);
 *
 * confirmDialog 를 화면 어딘가에 넣어 두는 것을 잊지 마세요.
 * 안 넣으면 물어보는 창이 안 그려져서 ask() 가 영영 안 끝납니다.
 */
export function useConfirm() {
  const [question, setQuestion] = useState<string | null>(null);

  /**
   * 답을 기다리는 약속(promise)의 "대답하는 쪽"을 담아 둡니다.
   *
   * useState 가 아니라 useRef 인 이유:
   *   화면을 다시 그려도 이 값은 그대로여야 합니다.
   *   그리고 이 값이 바뀌었다고 화면을 다시 그릴 필요도 없습니다.
   */
  const answerRef = useRef<((agreed: boolean) => void) | null>(null);

  /** 물어봅니다. 사용자가 누를 때까지 기다렸다가 예/아니오를 돌려줍니다. */
  const ask = useCallback((text: string) => {
    setQuestion(text);
    return new Promise<boolean>((resolve) => {
      answerRef.current = resolve;
    });
  }, []);

  /** 창을 닫으면서 답을 넘깁니다. */
  const close = useCallback((agreed: boolean) => {
    setQuestion(null);
    answerRef.current?.(agreed);
    answerRef.current = null;
  }, []);

  const confirmDialog = (
    <AlertDialog
      open={question !== null}
      // 바깥을 누르거나 ESC 로 닫으면 "아니오" 로 봅니다.
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <AlertDialogContent className="max-w-[320px] rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-extrabold">
            잠깐만요
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-slate-500">
            {question}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel
            onClick={() => close(false)}
            className="mt-0 h-11 flex-1 rounded-2xl text-sm font-bold"
          >
            그냥 둘게요
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className="h-11 flex-1 rounded-2xl bg-rose-600 text-sm font-bold hover:bg-rose-700"
          >
            지울게요
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { ask, confirmDialog };
}
