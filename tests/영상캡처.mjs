import { chromium } from "playwright";
import fs from "node:fs";

/**
 * 사용법 영상용 스틸컷. 장면마다 화면 + "눌러야 할 곳"의 위치를 저장합니다.
 *
 *   node tests/영상캡처.mjs <결과 폴더>
 *
 * 결과: <결과 폴더>/shots/<장면>.png, <결과 폴더>/shots.json
 * 서버(localhost:3000)가 떠 있어야 합니다. 자료 창고 없이(메모리) 돌려도 됩니다.
 */
const OUT = process.argv[2];
const APP = "http://localhost:3000";
const shots = [];
const b = await chromium.launch();
const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};
const wait = (p, ms = 900) => p.waitForTimeout(ms);

async function shot(page, id, targets = []) {
  const boxes = [];
  for (const t of targets) {
    try {
      const loc = typeof t === "string" ? page.locator(t) : t;
      await loc.first().scrollIntoViewIfNeeded({ timeout: 3000 });
      await wait(page, 400);
      const bb = await loc.first().boundingBox({ timeout: 3000 });
      if (bb) boxes.push(bb);
    } catch (e) {
      console.log(`  (${id}: 표시할 곳을 못 찾음 — ${e.message.split("\n")[0]})`);
    }
  }
  await page.screenshot({ path: `${OUT}/shots/${id}.png` });
  shots.push({ id, boxes });
  console.log(`  ${id} ✓ (표시 ${boxes.length}곳)`);
}
async function step(id, fn) {
  try {
    await fn();
  } catch (e) {
    console.log(`  ${id} ✗ ${e.message.split("\n")[0]}`);
  }
}

const now = new Date();
const M = now.getMonth() + 1;
const D = now.getDate();
const base = D >= 20 ? 3 : D + 1; // 달이 넘어가지 않게
const days = [base, base + 1, base + 3, base + 4, base + 7].filter((d) => d <= 28);
const dayBtn = (p, d) => p.getByLabel(new RegExp(`^${M}월 ${d}일`));

// ── 사장님 ─────────────────────────────────────────────
const owner = await (await b.newContext(phone)).newPage();
await owner.goto(APP, { waitUntil: "networkidle" });
await owner.getByText("시작하기").waitFor({ timeout: 15000 });
await shot(owner, "A01", [owner.getByRole("button", { name: "매장 새로 열기" })]);
await owner.getByRole("button", { name: "매장 새로 열기" }).click();
const nameIn = owner.getByPlaceholder("예: 우리 매장 성수점");
await nameIn.fill("행복분식 성수점");
await shot(owner, "A02", [nameIn]);
await shot(owner, "A03", [owner.getByRole("button", { name: "만들기" })]);
await owner.getByRole("button", { name: "만들기" }).click();
await owner.getByText("처음 오셨네요").waitFor({ timeout: 15000 });
const ownerName = owner.getByPlaceholder("예: 김사장");
await ownerName.fill("김사장");
await shot(owner, "A04", [ownerName]);
const pins = owner.locator('input[type="password"]');
await pins.nth(0).fill("1234");
await pins.nth(1).fill("1234");
await shot(owner, "A05", [pins.nth(0), pins.nth(1)]);
await shot(owner, "A06", [owner.getByRole("button", { name: "매장 시작하기" })]);
await owner.getByRole("button", { name: "매장 시작하기" }).click();
await wait(owner, 2000);
// 폰에서는 메뉴가 왼쪽 위 ≡ 버튼 안에 있습니다
const menuBtn = owner.getByRole("button", { name: "메뉴" });
await shot(owner, "A07", [menuBtn]);
await menuBtn.click();
await wait(owner, 700);
await shot(owner, "A07b", [owner.getByRole("button", { name: "직원 관리" })]);
await owner.getByRole("button", { name: "직원 관리" }).click();
await wait(owner, 1500);
if (!owner.url().includes("staff")) await owner.goto(`${APP}/#/staff`, { waitUntil: "networkidle" });
await wait(owner, 1000);
await shot(owner, "A08", [owner.getByRole("button", { name: /직원 추가/ })]);
await owner.getByRole("button", { name: /직원 추가/ }).click();
const sName = owner.getByPlaceholder("예: 서연");
const sPin = owner.getByPlaceholder("0000");
await sName.fill("서연");
await sPin.fill("1111");
await shot(owner, "A09", [sName, sPin]);
await shot(owner, "A10", [owner.getByRole("button", { name: "추가하기" })]);
await owner.getByRole("button", { name: "추가하기" }).click();
await wait(owner, 1200);
// 두 번째 직원
await owner.getByRole("button", { name: /직원 추가/ }).click();
await owner.getByPlaceholder("예: 서연").fill("민수");
await owner.getByPlaceholder("0000").fill("2222");
await owner.getByRole("button", { name: "추가하기" }).click();
await wait(owner, 1200);
await shot(owner, "A11", [owner.getByRole("button", { name: "수정" }).first()]);
await shot(owner, "A12", [owner.getByRole("button", { name: /카카오톡으로 초대하기/ })]);
const codeEl = owner.locator("p.tracking-\\[0\\.2em\\]").first();
const code = (await codeEl.textContent())?.trim();
await shot(owner, "A13", [codeEl]);
console.log(`  매장 코드 ${code}`);

await owner.goto(`${APP}/#/`, { waitUntil: "networkidle" });
await wait(owner, 1200);
await shot(owner, "A14", [menuBtn]);
await menuBtn.click();
await wait(owner, 700);
await shot(owner, "A14b", [owner.getByRole("button", { name: "근무표" })]);
await owner.getByRole("button", { name: "근무표" }).click();
await wait(owner, 1500);
if (!owner.url().includes("schedule")) await owner.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await wait(owner, 1500);
// 화면 순서: 누가·몇 시 고르기 → "이 시간으로 근무 등록" → 날짜 누르기 → 확인
const regBtn = owner.getByRole("button", { name: /이 시간으로 근무 등록/ });
const who = owner.getByLabel("근무자");
const t1 = owner.getByLabel("시작 시간");
const t2 = owner.getByLabel("종료 시간");
await step("A15-who", () => who.selectOption({ label: "서연" }));
await wait(owner, 300);
await shot(owner, "A15", [who, t1, t2]);
await shot(owner, "A16", [regBtn]);
await regBtn.click();
await wait(owner, 500);
for (const d of days) {
  await dayBtn(owner, d).click();
  await wait(owner, 250);
}
await shot(owner, "A17", [dayBtn(owner, days[0]).locator("xpath=..")]);
const okBtn = owner.getByRole("button", { name: /^확인/ });
await shot(owner, "A18", [okBtn]);
await okBtn.click();
await wait(owner, 2000);
// 민수 근무도 몇 개 (근무표가 풍성해 보이게)
await regBtn.click();
await wait(owner, 400);
await step("minsu-who", () => who.selectOption({ label: "민수" }));
for (const d of [days[0] + 2, days[1] + 2, days[2] + 2].filter((d) => d <= 28)) {
  await dayBtn(owner, d).click();
  await wait(owner, 200);
}
await okBtn.click();
await wait(owner, 2000);
await shot(owner, "A19", []);
await dayBtn(owner, days[1]).click();
await wait(owner, 800);
const trash = owner.getByLabel("서연 근무 지우기").first();
await shot(owner, "A20", [trash]);
await trash.click();
await wait(owner, 600);
const delBtn = owner.getByRole("button", { name: "지울게요" });
await shot(owner, "A21", [delBtn]);
// 실제로는 안 지움 — "지울게요"가 아닌 다른 버튼(그냥 둘게요/취소)을 누릅니다
await owner.getByRole("button", { name: "그냥 둘게요" }).click();
await wait(owner, 500);
await step("A22", async () => {
  const sum = owner.getByText(/며칠|몇 시간|합계/).first();
  await sum.scrollIntoViewIfNeeded();
  await wait(owner, 600);
  await shot(owner, "A22", [sum]);
});

// ── 알바생 서연 ────────────────────────────────────────
const staff = await (await b.newContext(phone)).newPage();
await staff.goto(`${APP}/?store=${code}`, { waitUntil: "networkidle" });
await staff.getByText("누구세요?").waitFor({ timeout: 15000 });
const nameSel = staff.getByLabel("이름");
await nameSel.selectOption("서연");
await shot(staff, "B01", [nameSel]);
const staffPin = staff.locator('input[type="password"]');
await staffPin.fill("1111");
await shot(staff, "B02", [staffPin]);
await shot(staff, "B03", [staff.getByRole("button", { name: "들어가기" })]);
await staff.getByRole("button", { name: "들어가기" }).click();
await wait(staff, 2000);
await staff.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await wait(staff, 1500);
await shot(staff, "B04", [staff.getByRole("button", { name: /이 시간으로 근무 등록/ })]);
await dayBtn(staff, days[2]).click();
await wait(staff, 800);
const swapBtn = staff.getByRole("button", { name: /교대 신청/ });
await shot(staff, "B05", [swapBtn]);
await swapBtn.click();
await wait(staff, 600);
await step("B06-fill", async () => {
  const me = staff.getByPlaceholder("예: 민수");
  if ((await me.count()) && !(await me.inputValue())) await me.fill("서연");
  await staff.getByPlaceholder("예: 서연").fill("민수");
  const why = staff.getByPlaceholder("예: 병원 예약");
  if (await why.count()) await why.fill("병원 예약");
});
await shot(staff, "B06", [staff.getByPlaceholder("예: 서연"), staff.getByRole("button", { name: "신청하기" })]);
await staff.getByRole("button", { name: "신청하기" }).click();
await wait(staff, 1500);

// ── 알바생 민수 (대신할 사람) ──────────────────────────
const minsu = await (await b.newContext(phone)).newPage();
await minsu.goto(`${APP}/?store=${code}`, { waitUntil: "networkidle" });
await minsu.getByText("누구세요?").waitFor({ timeout: 15000 });
await minsu.getByLabel("이름").selectOption("민수");
await minsu.locator('input[type="password"]').fill("2222");
await minsu.getByRole("button", { name: "들어가기" }).click();
await wait(minsu, 2000);
await minsu.goto(`${APP}/#/swaps`, { waitUntil: "networkidle" });
await wait(minsu, 1500);
const confirmBtn = minsu.getByRole("button", { name: "내용 확인" });
await shot(minsu, "B07", [confirmBtn]);
await step("B07-click", () => confirmBtn.click());
await wait(minsu, 1500);

// ── 사장님 승인 · 알림 ─────────────────────────────────
await owner.goto(`${APP}/#/swaps`, { waitUntil: "networkidle" });
await wait(owner, 2500);
await shot(owner, "B08", [owner.getByRole("button", { name: "승인" })]);
await owner.goto(`${APP}/#/`, { waitUntil: "networkidle" });
await wait(owner, 2500);
const bell = owner.getByRole("button", { name: /알림/ });
await shot(owner, "B09", [bell]);
await bell.click();
await wait(owner, 800);
await shot(owner, "B10", []);
await owner.goto(`${APP}/#/guide`, { waitUntil: "networkidle" });
await wait(owner, 1200);
await menuBtn.click();
await wait(owner, 700);
await shot(owner, "END", [owner.getByRole("button", { name: "사용법" })]);

fs.writeFileSync(`${OUT}/shots.json`, JSON.stringify(shots, null, 1));
await b.close();
console.log(`끝 — ${shots.length} 장면`);
