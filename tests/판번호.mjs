const API = "http://localhost:3000";

const ok = (m) => console.log(`  OK   ${m}`);
const fail = (m) => { console.log(`  실패 ${m}`); process.exitCode = 1; };

const code = (await (await fetch(`${API}/api/stores`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "동시검사점" }),
})).json()).code;

const readOne = async () =>
  await (await fetch(`${API}/api/stores/${code}/shifts`)).json();

const put = async (items, baseVersion) => {
  const r = await fetch(`${API}/api/stores/${code}/shifts`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, baseVersion }) });
  return { status: r.status, body: await r.json() };
};

// ── 둘 다 같은 판을 보고 있습니다 ────────────────────────
const 사장님 = await readOne();
const 알바생 = await readOne();
console.log(`\n둘 다 ${사장님.version}번 판을 보고 있습니다\n`);

// 사장님이 먼저 저장합니다
const a = await put(
  [...사장님.items, { workDate: "2026-09-10", person: "서연", start: "09:00", end: "18:00" }],
  사장님.version);
a.status === 200 ? ok(`사장님 저장됨 (→ ${a.body.version}번 판)`) : fail(`사장님 저장 실패 ${a.status}`);

// 알바생은 아직 옛 판을 들고 있습니다
const b = await put(
  [...알바생.items, { workDate: "2026-09-11", person: "민수", start: "12:00", end: "20:00" }],
  알바생.version);
b.status === 409
  ? ok("★ 알바생 저장은 거절됨 — 그 사이 남이 고쳤다고 알려 준다")
  : fail(`거절해야 하는데 ${b.status} 를 돌려줌`);

// 앱은 이때 서버가 준 최신 목록에 자기 것을 다시 얹습니다
const c = await put(
  [...b.body.items, { workDate: "2026-09-11", person: "민수", start: "12:00", end: "20:00" }],
  b.body.version);
c.status === 200 ? ok("다시 얹어서 저장됨") : fail(`재시도 실패 ${c.status}`);

const 최종 = (await readOne()).items;
console.log(`\n남은 근무 ${최종.length}건`);
최종.forEach((s) => console.log(`   ${s.workDate}  ${s.person}`));
console.log(최종.length === 2 ? "\n✅ 둘 다 남았습니다" : "\n❌ 하나가 사라졌습니다");
if (최종.length !== 2) process.exitCode = 1;
