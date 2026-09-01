import { Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";
import { useRole } from "@/contexts/RoleContext";

/**
 * 직원 관리 — 매장 직원을 추가·수정·삭제하는 화면입니다. 사장님 전용.
 *
 * TODO(2단계): trpc.members.list / add / update / delete 를 연결합니다.
 */

type Member = {
  id: number;
  displayName: string;
  memberRole: "owner" | "staff";
};

export default function Staff() {
  const { isOwnerMode } = useRole();

  // 아직 연결 전이라 빈 배열입니다.
  const members: Member[] = [];

  // 주소창에 /staff 를 직접 쳐서 들어오는 경우를 막습니다.
  if (!isOwnerMode) {
    return (
      <AppLayout title="직원 관리">
        <Card className="rounded-3xl border-0 shadow-sm shadow-slate-200/60">
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
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

  return (
    <AppLayout
      title="직원 관리"
      description="매장 직원을 추가하거나 이름을 고칠 수 있어요."
      action={
        <Button className="h-10 gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          직원 추가
        </Button>
      }
    >
      <Card className="overflow-hidden rounded-3xl border-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <CardTitle className="text-lg font-extrabold tracking-tight">
            직원 목록 {members.length > 0 && `(${members.length}명)`}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 sm:p-7">
          {members.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">
              등록된 직원이 없습니다.
              <br />
              (2단계에서 서버와 연결할 예정입니다)
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-bold text-slate-900">{member.displayName}</p>
                    <p className="text-xs text-slate-500">
                      {member.memberRole === "owner" ? "사장님" : "직원"}
                    </p>
                  </div>

                  {member.memberRole === "owner" ? (
                    <span className="text-xs font-bold text-slate-400">소유자</span>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl text-xs">
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs text-rose-600 hover:bg-rose-50"
                      >
                        삭제
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
