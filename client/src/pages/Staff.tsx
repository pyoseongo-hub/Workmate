import { useState } from "react";
import { KeyRound, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { InviteCard } from "@/components/InviteCard";
import { FormDialog, Field, inputClass } from "@/components/FormDialog";
import { useConfirm } from "@/hooks/useConfirm";
import type { Member } from "@/types";

/**
 * 직원 관리 — 매장 직원을 추가·수정·삭제하는 화면입니다. 사장님 전용.
 *
 * 직원마다 4자리 번호가 있습니다. 그 번호로 앱에 들어옵니다.
 * 사장님이 정해서 알려 주면 됩니다.
 */
export default function Staff() {
  const { members, setMembers, isOwnerMode, myName } = useRole();

  /** 열려 있는 창: 없으면 null, 추가면 "new", 수정이면 그 직원 */
  const [editing, setEditing] = useState<Member | "new" | null>(null);

  // ⚠️ 아래 "사장님 전용" 안내로 일찍 끝내는 길이 있습니다.
  //    React 규칙상 갈라지기 전에 불러 두어야 합니다.
  const { ask, confirmDialog } = useConfirm();

  // 주소창에 /staff 를 직접 쳐서 들어오는 경우를 막습니다.
  if (!isOwnerMode) {
    return (
      <AppLayout title="직원 관리">
        <Card className="rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-12">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-bold text-slate-700">사장님 전용 화면입니다.</p>
            <p className="text-xs text-slate-400">
              직원을 추가하거나 번호를 바꾸려면
              <br />
              사장님 이름으로 들어와 주세요.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const save = (name: string, pin: string) => {
    if (editing === "new") {
      // 새 번호는 지금 있는 번호 중 가장 큰 값 + 1
      const nextId = Math.max(0, ...members.map((member) => member.id)) + 1;
      setMembers([...members, { id: nextId, name, pin, role: "staff" }]);
    } else if (editing) {
      setMembers(
        members.map((member) =>
          member.id === editing.id ? { ...member, name, pin } : member
        )
      );
    }
    setEditing(null);
  };

  const remove = async (member: Member) => {
    if (!(await ask(`${member.name} 직원을 삭제할까요?`))) return;
    setMembers(members.filter((item) => item.id !== member.id));
  };

  /** 이름이 겹치면 누가 누군지 알 수 없습니다. 미리 막습니다. */
  const isNameTaken = (name: string) =>
    members.some(
      (member) =>
        member.name === name && (editing === "new" || member.id !== editing?.id)
    );

  return (
    <AppLayout
      title="직원 관리"
      description="직원을 추가하고, 앱에 들어올 때 쓸 번호를 정해 주세요."
      action={
        <Button
          onClick={() => setEditing("new")}
          className="h-10 gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          직원 추가
        </Button>
      }
    >
      <InviteCard />

      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
          <CardTitle className="text-lg font-extrabold tracking-tight">
            직원 목록 ({members.length}명)
          </CardTitle>
          <p className="mt-1 text-xs text-slate-400">
            직원에게 이름과 번호를 알려 주면 그걸로 들어옵니다.
          </p>
        </CardHeader>

        <CardContent className="p-4 sm:p-7">
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold text-slate-900">{member.name}</p>
                    {member.name === myName && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        나
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    {member.role === "owner" ? "사장님" : "직원"}
                    <span className="text-slate-300">·</span>
                    <KeyRound className="h-3 w-3" />
                    {member.pin}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(member)}
                    className="rounded-xl text-xs"
                  >
                    수정
                  </Button>
                  {member.role === "owner" ? (
                    <span className="flex items-center px-2 text-xs font-bold text-slate-400">
                      소유자
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(member)}
                      className="rounded-xl text-xs text-rose-600 hover:bg-rose-50"
                    >
                      삭제
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {editing && (
        <MemberDialog
          initial={editing === "new" ? null : editing}
          isNameTaken={isNameTaken}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDialog}
    </AppLayout>
  );
}

/** 직원 추가·수정 창 */
function MemberDialog({
  initial,
  isNameTaken,
  onSubmit,
  onClose,
}: {
  initial: Member | null;
  isNameTaken: (name: string) => boolean;
  onSubmit: (name: string, pin: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [pin, setPin] = useState(initial?.pin ?? "");
  const [error, setError] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("이름을 적어 주세요.");
      return;
    }
    if (isNameTaken(trimmed)) {
      setError("같은 이름이 이미 있습니다. 구분되는 이름으로 적어 주세요.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("번호는 숫자 4자리로 정해 주세요.");
      return;
    }
    onSubmit(trimmed, pin);
  };

  return (
    <FormDialog
      title={initial ? "직원 정보 수정" : "직원 추가"}
      description="이름과 번호를 직원에게 알려 주면 그걸로 앱에 들어옵니다."
      submitLabel={initial ? "수정하기" : "추가하기"}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="이름">
        <input
          value={name}
          autoFocus
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder="예: 서연"
          className={inputClass}
        />
      </Field>

      <Field label="들어올 때 쓸 번호 (숫자 4자리)">
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, ""));
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="0000"
          className={`${inputClass} text-center text-lg tracking-[0.4em]`}
        />
      </Field>

      <p className="text-[11px] leading-4 text-slate-400">
        번호는 목록에서 다시 볼 수 있으니, 직원이 잊어도 알려 줄 수 있어요.
      </p>
    </FormDialog>
  );
}
