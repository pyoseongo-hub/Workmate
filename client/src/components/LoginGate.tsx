import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, LogIn, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { Field, inputClass } from "@/components/FormDialog";

/**
 * 앱에 들어오기 전 거치는 문입니다.
 *
 *   직원이 아무도 없으면  → 처음 설정 (사장님 만들기)
 *   아직 안 들어왔으면    → 이름 고르고 번호 넣기
 *   들어왔으면            → 앱 화면
 *
 * 한 번 들어오면 이 기기가 기억하므로 다음부터는 바로 앱이 열립니다.
 */
export function LoginGate({ children }: { children: ReactNode }) {
  const { members, myName, setupOwner, login } = useRole();

  // 함께 보는 저장소는 조금 늦게 도착합니다.
  // 곧바로 "직원이 없네" 라고 판단하면 이미 있는 매장인데도
  // 처음 설정 화면이 번쩍 스쳐 지나갑니다. 잠깐 기다립니다.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (myName && members.some((member) => member.name === myName)) {
    return <>{children}</>;
  }

  if (members.length === 0) {
    return waited ? <FirstSetup onDone={setupOwner} /> : <Waiting />;
  }

  return <SignIn members={members} onLogin={login} />;
}

/** 저장소를 기다리는 동안 보여 주는 화면 */
function Waiting() {
  return (
    <Shell>
      <p className="text-center text-sm text-slate-400">잠시만 기다려 주세요…</p>
    </Shell>
  );
}

/** 로고와 배경을 담은 공통 껍데기 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-lg shadow-slate-900/15">
            <CalendarDays className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold tracking-[-0.04em]">WorkMate</p>
            <p className="mt-0.5 text-xs text-slate-400">
              우리 매장 근무표 · 교대 · 근무일지
            </p>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-xl shadow-slate-200/70">
          {children}
        </div>
      </div>
    </div>
  );
}

/** 아무도 없을 때 — 사장님을 만듭니다 */
function FirstSetup({ onDone }: { onDone: (name: string, pin: string) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("이름을 적어 주세요.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("번호는 숫자 4자리로 정해 주세요.");
      return;
    }
    if (pin !== pinAgain) {
      setError("두 번 넣은 번호가 다릅니다.");
      return;
    }
    onDone(name.trim(), pin);
  };

  return (
    <Shell>
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-blue-600" />
        <h1 className="text-base font-extrabold tracking-tight">처음 오셨네요</h1>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-slate-400">
        사장님 정보를 넣으면 매장이 만들어집니다.
        <br />
        직원은 그다음에 추가하시면 됩니다.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="사장님 이름">
          <input
            value={name}
            autoFocus
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="예: 김사장"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="내 번호 (숫자 4자리)">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, ""));
                setError("");
              }}
              placeholder="••••"
              className={`${inputClass} text-center tracking-[0.4em]`}
            />
          </Field>
          <Field label="번호 확인">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinAgain}
              onChange={(event) => {
                setPinAgain(event.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="••••"
              className={`${inputClass} text-center tracking-[0.4em]`}
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {error}
          </p>
        )}

        <Button
          onClick={submit}
          className="h-12 w-full rounded-xl bg-slate-900 text-sm font-bold hover:bg-slate-800"
        >
          매장 시작하기
        </Button>

        <p className="text-center text-[11px] leading-4 text-slate-400">
          번호는 앱에 들어올 때 씁니다. 잊지 않을 숫자로 정해 주세요.
        </p>
      </div>
    </Shell>
  );
}

/** 이름을 고르고 번호를 넣어 들어옵니다 */
function SignIn({
  members,
  onLogin,
}: {
  members: ReturnType<typeof useRole>["members"];
  onLogin: (name: string, pin: string) => boolean;
}) {
  const [name, setName] = useState(members[0]?.name ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!/^\d{4}$/.test(pin)) {
      setError("번호 4자리를 넣어 주세요.");
      return;
    }
    if (!onLogin(name, pin)) {
      setError("이름과 번호가 맞지 않습니다.");
      setPin("");
    }
  };

  return (
    <Shell>
      <div className="flex items-center gap-2">
        <LogIn className="h-4 w-4 text-blue-600" />
        <h1 className="text-base font-extrabold tracking-tight">누구세요?</h1>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        이름을 고르고 내 번호를 넣어 주세요.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="이름">
          <select
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            className={`${inputClass} font-bold`}
          >
            {members.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
                {member.role === "owner" ? " (사장님)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="내 번호 (숫자 4자리)">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, ""));
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="••••"
            className={`${inputClass} h-14 text-center text-2xl tracking-[0.5em]`}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {error}
          </p>
        )}

        <Button
          onClick={submit}
          disabled={pin.length !== 4}
          className="h-12 w-full rounded-xl bg-slate-900 text-sm font-bold hover:bg-slate-800"
        >
          들어가기
        </Button>

        <p className="text-center text-[11px] leading-4 text-slate-400">
          번호를 모르면 사장님께 물어보세요.
        </p>
      </div>
    </Shell>
  );
}
