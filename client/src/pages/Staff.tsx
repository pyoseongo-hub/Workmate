import { useState } from "react";
import { Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { useLocalState } from "@/hooks/useLocalState";
import { FormDialog, Field, inputClass } from "@/components/FormDialog";
import { STORAGE_KEYS, type Member } from "@/types";

/**
 * 직원 관리 — 매장 직원을 추가·수정·삭제하는 화면입니다. 사장님 전용.
 *
 * 등록한 직원은 브라우저에 저장되어 새로고침해도 남습니다.
 * 다음 단계에서 서버에 저장하도록 바꿉니다.
 */

export default function Staff() {
  const { isOwnerMode } = useRole();

  const [members, setMembers] = useLocalState<Member[]>(STORAGE_KEYS.members, [
    { id: 1, name: "사장님", role: "owner" },
  ]);

  /** 열려 있는 창: 없으면 null, 추가면 "new", 수정이면 그 직원 */
  const [editing, setEditing] = useState<Member | "new" | null>(null);

  // 주소창에 /staff 를 직접 쳐서 들어오는 경우를 막습니다.
  if (!isOwnerMode) {
    return (
      <AppLayout title="직원 관리">
        <Card className="rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-12">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-bold text-slate-700">사장님 전용 화면입니다.</p>
            <p className="text-xs text-slate-400">
              오른쪽 위 <span className="font-semibold">알바생 모드</span> 배지를 눌러
              <br />
              사장님 비밀번호를 입력해 주세요.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const save = (name: string) => {
    if (editing === "new") {
      // 새 번호는 지금 있는 번호 중 가장 큰 값 + 1
      const nextId = Math.max(0, ...members.map((member) => member.id)) + 1;
      setMembers([...members, { id: nextId, name, role: "staff" }]);
    } else if (editing) {
      setMembers(
        members.map((member) =>
          member.id === editing.id ? { ...member, name } : member
        )
      );
    }
    setEditing(null);
  };

  const remove = (member: Member) => {
    if (!confirm(`${member.name} 직원을 삭제할까요?`)) return;
    setMembers(members.filter((item) => item.id !== member.id));
  };

  return (
    <AppLayout
      title="직원 관리"
      description="매장 직원을 추가하거나 이름을 고칠 수 있어요."
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
      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
          <CardTitle className="text-lg font-extrabold tracking-tight">
            직원 목록 ({members.length}명)
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-7">
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{member.name}</p>
                  <p className="text-xs text-slate-500">
                    {member.role === "owner" ? "사장님" : "직원"}
                  </p>
                </div>

                {member.role === "owner" ? (
                  <span className="shrink-0 text-xs font-bold text-slate-400">
                    소유자
                  </span>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(member)}
                      className="rounded-xl text-xs"
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(member)}
                      className="rounded-xl text-xs text-rose-600 hover:bg-rose-50"
                    >
                      삭제
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {editing && (
        <MemberDialog
          initialName={editing === "new" ? "" : editing.name}
          isNew={editing === "new"}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </AppLayout>
  );
}

/** 직원 추가·수정 창 */
function MemberDialog({
  initialName,
  isNew,
  onSubmit,
  onClose,
}: {
  initialName: string;
  isNew: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("이름을 적어 주세요.");
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <FormDialog
      title={isNew ? "직원 추가" : "이름 수정"}
      description={
        isNew ? "새로 들어온 직원을 등록합니다." : "직원 이름을 고칩니다."
      }
      submitLabel={isNew ? "추가하기" : "수정하기"}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="직원 이름">
        <input
          value={name}
          autoFocus
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="예: 서연"
          className={inputClass}
        />
      </Field>
    </FormDialog>
  );
}
