import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 화면 위에 떠오르는 입력 창의 공통 껍데기입니다.
 *
 * 화면 4곳(근무일자 등록·교대 신청·근무일지 작성·직원 추가)이
 * 이 부품 하나를 같이 씁니다. 생김새를 바꾸려면 여기만 고치면 됩니다.
 *
 * 폰에서는 아래에서 올라오고, PC에서는 가운데에 뜹니다.
 */

type Props = {
  title: string;
  description?: string;
  /** 저장 버튼 글씨. 기본값은 "저장하기" */
  submitLabel?: string;
  /** 저장 중이면 버튼이 잠깁니다 */
  submitting?: boolean;
  /** 빨간 글씨로 보여줄 오류 메시지 */
  error?: string;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
};

export function FormDialog({
  title,
  description,
  submitLabel = "저장하기",
  submitting = false,
  error,
  onSubmit,
  onClose,
  children,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {children}

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-600">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl text-sm font-bold"
            >
              취소
            </Button>
            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="h-11 flex-1 rounded-xl bg-slate-900 text-sm font-bold hover:bg-slate-800"
            >
              {submitting ? "저장 중..." : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 입력 창 안에서 쓰는 글자 입력칸 (라벨 + 입력) */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

/** 공통 입력칸 스타일. className 자리에 그대로 넣어 쓰세요. */
export const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500";
