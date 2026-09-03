import { BookOpen, CircleCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";

/**
 * 사용법 — 앱 안에 넣어 둔 설명서입니다.
 *
 * 왜 앱 안에 두나 (사장님 지시, 2026-09-03):
 *   바깥 링크로 두면 막혔을 때 그 링크를 다시 찾아야 합니다.
 *   메뉴에 있으면 화면을 보다가 바로 열어 볼 수 있습니다.
 *
 * ⚠️ 화면 글자가 바뀌면 여기도 함께 고쳐야 합니다.
 *    설명서가 틀리면 없느니만 못합니다.
 */

/** 화면에 실제로 뜨는 버튼·글자를 감쌉니다 */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-block whitespace-nowrap rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[0.92em] font-bold text-slate-700 shadow-[0_1px_0_theme(colors.slate.200)]">
      {children}
    </span>
  );
}

function Step({
  n,
  title,
  tone,
  children,
}: {
  n: number;
  title: string;
  tone: "owner" | "staff";
  children: React.ReactNode;
}) {
  const badge =
    tone === "owner" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700";

  return (
    <li className="flex gap-3.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tabular-nums ${badge}`}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900">
          {title}
        </h3>
        <div className="mt-1.5 space-y-2 text-[13px] leading-6 text-slate-600">
          {children}
        </div>
      </div>
    </li>
  );
}

/** 짚어 둘 것 */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-[12.5px] leading-5 text-amber-900">
      {children}
    </p>
  );
}

function Ask({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[13.5px] font-bold text-slate-800">
        {q}
        <span className="shrink-0 text-lg font-normal leading-none text-slate-300 group-open:hidden">
          ＋
        </span>
        <span className="hidden shrink-0 text-lg font-normal leading-none text-slate-300 group-open:inline">
          －
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-100 px-4 py-3.5 text-[13px] leading-6 text-slate-600">
        {children}
      </div>
    </details>
  );
}

export default function Guide() {
  return (
    <AppLayout
      title="사용법"
      description="처음 쓰실 때 이 순서대로 따라오시면 됩니다."
    >
      {/* ── 이 앱이 하는 일 ───────────────────────────────── */}
      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold tracking-tight">
            <BookOpen className="h-4 w-4 text-slate-400" />
            이 앱이 하는 일
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <ul className="space-y-2">
            {[
              "누가 며칠 몇 시에 나오는지 달력에 적기",
              "알바생끼리 교대 바꾸기 · 사장님이 승인하기",
              "실제 출퇴근 시각을 근무일지에 남기기",
              "이 달 사람마다 며칠 · 몇 시간 세어 주기",
              "누가 무엇을 고쳤는지 사장님께 알려 주기",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <span className="text-[13px] leading-6 text-slate-700">{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── 사장님 ────────────────────────────────────────── */}
      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <CardTitle className="text-base font-extrabold tracking-tight text-blue-700">
            사장님
          </CardTitle>
          <p className="mt-1 text-xs text-slate-400">처음 한 번만 5분이면 됩니다.</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <ol className="space-y-5">
            <Step n={1} tone="owner" title="매장 만들기">
              <p>
                <Key>매장 새로 열기</Key> 를 누르고 매장 이름을 적으세요.
              </p>
              <p>
                그다음 사장님 이름과 <b className="text-slate-800">숫자 4자리</b> 를
                정합니다. 앞으로 들어올 때 쓸 번호입니다.
              </p>
            </Step>

            <Step n={2} tone="owner" title="직원 넣기">
              <p>
                <Key>직원 관리</Key> 에서 <Key>직원 추가</Key> 를 누르고 이름과 숫자
                4자리를 적으세요.
              </p>
              <p>
                번호는 사장님이 정해서 알려 주시면 됩니다. 목록에서 다시 볼 수 있으니
                알바생이 잊어도 알려 줄 수 있습니다.
              </p>
            </Step>

            <Step n={3} tone="owner" title="초대하기">
              <p>
                같은 화면 아래 <Key>카카오톡으로 초대하기</Key> 를 누르면 링크가
                복사됩니다. 단톡방에 붙여넣기 하세요.
              </p>
              <p>
                링크가 안 열린다고 하면 <b className="text-slate-800">매장 코드</b> 여섯
                글자를 불러 주셔도 됩니다.
              </p>
            </Step>

            <Step n={4} tone="owner" title="근무 넣기 — 한 달치를 한 번에">
              <p>
                근무표에서 <Key>＋ 이 시간으로 근무 등록</Key> 을 누릅니다. 이름과 시간을
                한 번만 고른 뒤, 달력에서 그 사람이 나오는 날짜를 쭉 눌러 나가면 됩니다.
              </p>
              <p>
                누르는 동안에는 <b className="text-slate-800">아직 저장되지 않습니다.</b>{" "}
                다 됐으면 <Key>확인</Key> 을 누르세요. 그때 한꺼번에 저장됩니다.
              </p>
              <Tip>
                <b>지우려면</b> 날짜를 누르고 아래 목록에서 휴지통을 누르세요.{" "}
                <Key>지울게요</Key> 를 한 번 더 눌러야 지워집니다.
              </Tip>
            </Step>

            <Step n={5} tone="owner" title="이 달 합계 보기">
              <p>
                근무표 화면을 내리면 사람마다{" "}
                <b className="text-slate-800">며칠 · 몇 시간</b> 이 나옵니다. 시작 시각부터
                끝난 시각까지를 그대로 센 숫자입니다.
              </p>
            </Step>
          </ol>
        </CardContent>
      </Card>

      {/* ── 알바생 ────────────────────────────────────────── */}
      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <CardTitle className="text-base font-extrabold tracking-tight text-violet-700">
            알바생
          </CardTitle>
          <p className="mt-1 text-xs text-slate-400">받은 링크만 있으면 됩니다.</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <ol className="space-y-5">
            <Step n={1} tone="staff" title="들어가기">
              <p>
                사장님이 보낸 링크를 누르면 목록에서 <b className="text-slate-800">내 이름</b>{" "}
                을 고르고, 받은 숫자 4자리를 넣으면 끝입니다.
              </p>
              <p>앱을 받을 필요도, 가입할 필요도 없습니다.</p>
            </Step>

            <Step n={2} tone="staff" title="내 근무 넣기">
              <p>
                <Key>＋ 이 시간으로 근무 등록</Key> 으로 내가 되는 날을 눌러 두면 됩니다.
                사장님 화면에도 바로 보이고, 사장님께 알림이 갑니다.
              </p>
              <Tip>
                넣고 지우는 건 <b>오늘부터 앞날</b> 만 됩니다. 지난 날짜는 "그날 일했다"는
                기록이라서 사장님만 고칠 수 있습니다.
              </Tip>
            </Step>

            <Step n={3} tone="staff" title="교대 바꾸기">
              <p>
                달력에서 날짜를 고르면 위쪽에 <Key>교대 신청</Key> 이 나옵니다. 그날 근무가
                그대로 신청서에 들어가서 날짜를 다시 적을 필요가 없습니다.
              </p>
              <p>
                신청하면 <b className="text-slate-800">① 대신할 사람이 확인 → ② 사장님이 승인</b>{" "}
                순서로 넘어갑니다. 사장님이 승인해야 근무표가 실제로 바뀝니다.
              </p>
            </Step>
          </ol>
        </CardContent>
      </Card>

      {/* ── 권한 표 ───────────────────────────────────────── */}
      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <CardTitle className="text-base font-extrabold tracking-tight">
            누가 무엇을 할 수 있나
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5 text-left">하는 일</th>
                  <th className="px-3 py-2.5 text-left">사장님</th>
                  <th className="px-3 py-2.5 text-left">알바생</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["앞날 근무 넣기·지우기", "가능", "내 것만"],
                  ["지난 날짜 고치기", "가능", "안 됨"],
                  ["교대 신청", "안 함", "가능"],
                  ["교대 승인", "사장님만", "안 됨"],
                  ["직원 추가·삭제", "사장님만", "안 됨"],
                  ["이 달 합계 보기", "전 직원", "내 것만"],
                ].map(([what, owner, staff]) => (
                  <tr key={what} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-bold text-slate-800">{what}</td>
                    <td
                      className={`px-3 py-2.5 ${owner === "안 함" ? "text-slate-400" : "text-blue-600"}`}
                    >
                      {owner}
                    </td>
                    <td
                      className={`px-3 py-2.5 ${staff === "안 됨" ? "text-slate-400" : "text-violet-600"}`}
                    >
                      {staff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 자주 막히는 곳 ────────────────────────────────── */}
      <Card className="overflow-hidden rounded-3xl border-0 py-0 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <CardTitle className="text-base font-extrabold tracking-tight">
            자주 막히는 곳
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 sm:p-5">
          <Ask q="번호를 잊었어요">
            <p>
              사장님이 <Key>직원 관리</Key> 에서 볼 수 있습니다. 물어보세요.
            </p>
            <p>
              사장님 본인이 잊으셨다면 되찾을 방법이 없습니다. 매장을 새로 여셔야 합니다.
            </p>
          </Ask>

          <Ask q="알바생 폰에서 근무표가 안 보여요">
            <p>
              사장님이 보낸 <b className="text-slate-800">링크</b> 로 들어갔는지 확인해
              주세요. 주소만 치고 들어가면 매장이 연결되지 않습니다.
            </p>
            <p>
              그럴 때는 <Key>받은 코드로 들어가기</Key> 에 여섯 글자 코드를 넣으면 됩니다.
            </p>
          </Ask>

          <Ask q="휴지통을 눌렀는데 아무 일도 안 일어나요">
            <p>
              <Key>잠깐만요</Key> 창이 뜨면 <Key>지울게요</Key> 를 한 번 더 눌러 주세요.
              실수로 지우는 걸 막으려고 두 번 묻습니다.
            </p>
            <p>지난 날짜는 알바생이 지울 수 없습니다. 휴지통 자체가 안 보입니다.</p>
          </Ask>

          <Ask q="누가 뭘 바꿨는지 어떻게 아나요">
            <p>
              오른쪽 위 <b className="text-slate-800">종 모양</b> 에 숫자가 뜹니다. 눌러
              보면 "누가 무엇을 했는지" 가 시간 순으로 적혀 있습니다.
            </p>
            <p>본인이 한 일은 안 뜹니다. 이미 아시니까요.</p>
          </Ask>
        </CardContent>
      </Card>

      {/* ── 알아 두실 것 ──────────────────────────────────── */}
      <Card className="overflow-hidden rounded-3xl border-0 border-l-[3px] border-l-rose-500 py-0 shadow-sm shadow-slate-200/60">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="space-y-2 text-[13px] leading-6 text-slate-600">
            <p className="text-[14px] font-extrabold text-slate-900">
              쓰시기 전에 알아 두실 것
            </p>
            <p>
              <b className="text-slate-800">매장 코드를 아는 사람은 그 매장 근무표를 봅니다.</b>{" "}
              서로 아는 사람끼리 쓰는 것을 전제로 만들었습니다. 모르는 사람에게 링크가
              새지 않게 해 주세요.
            </p>
            <p>
              <b className="text-slate-800">4자리 번호는 은행 비밀번호 같은 수준이 아닙니다.</b>{" "}
              "남의 이름으로 잘못 들어가는 것" 을 막는 정도로 봐 주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
