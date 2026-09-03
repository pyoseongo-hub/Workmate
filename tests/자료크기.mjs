const API = "http://localhost:3000";

const code = (await (await fetch(`${API}/api/stores`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "크기검사점" }),
})).json()).code;

// 직원 10명 매장이 1년 쓰면 쌓이는 양
const shifts = [];
for (let m = 1; m <= 12; m += 1)
  for (let d = 1; d <= 22; d += 1)
    for (const who of ["서연","민수","지훈","예은","도윤","하늘","시우","다인","건우","윤아"])
      shifts.push({ workDate: `2026-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`,
                    person: who, start: "09:00", end: "18:00" });

const logs = shifts.slice(0, 2640).map((s, i) => ({
  id: i + 1, workDate: s.workDate, planned: "09:00–18:00",
  clockIn: "09:03", clockOut: "18:02", note: "" }));

for (const [key, items] of [["shifts", shifts], ["logs", logs]])
  await fetch(`${API}/api/stores/${code}/${key}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }) });

const size = async (path) => (await (await fetch(`${API}${path}`)).arrayBuffer()).byteLength;

const full = await size(`/api/stores/${code}`);
const check = await size(`/api/stores/${code}/versions`);

console.log(`\n직원 10명이 1년 쓴 매장 (근무 ${shifts.length}건 + 근무일지 ${logs.length}건)\n`);
console.log(`  처음 열 때 한 번          ${(full / 1024).toFixed(0)} KB`);
console.log(`  그 뒤 8초마다 확인할 때    ${check} B   ← 바뀐 게 없으면 이게 전부`);

// 하루치 (8시간 켜 두기 = 3,600번 확인)
const perDayNew = full + check * 3600;
const perDayOld = 471 * 1024 * 43 * 480;
console.log(`\n  하루 8시간 켜 두면`);
console.log(`    고치기 전   ${(perDayOld / 1024 / 1024 / 1024).toFixed(1)} GB`);
console.log(`    고친 뒤     ${(perDayNew / 1024 / 1024).toFixed(1)} MB`);
console.log(`    → ${Math.round(perDayOld / perDayNew).toLocaleString()}분의 1`);

// Render 무료 100GB 로 몇 명이나
const GB = 1024 ** 3;
console.log(`\n  Render 무료(월 100GB) 로 버틸 수 있는 사람 수 (하루 8시간 × 22일 기준)`);
console.log(`    고치기 전   ${Math.floor(100 * GB / (perDayOld * 22))}명`);
console.log(`    고친 뒤     ${Math.floor(100 * GB / (perDayNew * 22)).toLocaleString()}명`);
