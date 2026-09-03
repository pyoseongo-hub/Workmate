import { chromium } from "playwright";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("./결과/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

const ok = (m) => console.log(`  OK  ${m}`);
const fail = (m) => { console.log(`  실패 ${m}`); process.exitCode = 1; };

const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const now = new Date();
const M = now.getMonth() + 1;
const D = now.getDate();
const d1 = D >= 26 ? D - 3 : D + 1;
const d2 = D >= 26 ? D - 2 : D + 2;
const d3 = D >= 26 ? D - 1 : D + 3;

const acceptDialogs = (page) => page.on("dialog", (d) => d.accept());

// ══════════ 매장 준비 ══════════
const ownerCtx = await browser.newContext(phone);
const owner = await ownerCtx.newPage();
acceptDialogs(owner);
await owner.goto(APP, { waitUntil: "networkidle" });
await owner.getByText("시작하기").waitFor({ timeout: 15000 });
await owner.getByRole("button", { name: "매장 새로 열기" }).click();
await owner.getByPlaceholder("예: 우리 매장 성수점").fill("알림검사점");
await owner.getByRole("button", { name: "만들기" }).click();
await owner.getByText("처음 오셨네요").waitFor({ timeout: 15000 });
await owner.getByPlaceholder("예: 김사장").fill("김사장");
const pins = owner.locator('input[type="password"]');
await pins.nth(0).fill("1234");
await pins.nth(1).fill("1234");
await owner.getByRole("button", { name: "매장 시작하기" }).click();
await owner.waitForTimeout(1200);

await owner.goto(`${APP}/#/staff`, { waitUntil: "networkidle" });
await owner.waitForTimeout(600);
await owner.getByRole("button", { name: /직원 추가/ }).click();
await owner.getByPlaceholder("예: 서연").fill("서연");
await owner.getByPlaceholder("0000").fill("1111");
await owner.getByRole("button", { name: "추가하기" }).click();
await owner.waitForTimeout(800);
const code = (await owner.locator("p.tracking-\\[0\\.2em\\]").first().textContent())?.trim();
ok(`매장 준비 (${code})`);

// ══════════ 알바생(서연) ══════════
const staffCtx = await browser.newContext(phone);
const staff = await staffCtx.newPage();
acceptDialogs(staff);
await staff.goto(`${APP}/?store=${code}`, { waitUntil: "networkidle" });
await staff.getByText("누구세요?").waitFor({ timeout: 15000 });
await staff.getByLabel("이름").selectOption("서연");
await staff.locator('input[type="password"]').fill("1111");
await staff.getByRole("button", { name: "들어가기" }).click();
await staff.waitForTimeout(1500);

await staff.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await staff.waitForTimeout(1200);

// ── 1. 누르는 동안에는 저장되지 않는가 ─────────────
await staff.getByRole("button", { name: /이 시간으로 근무 등록/ }).click();
await staff.waitForTimeout(300);
for (const day of [d1, d2, d3]) {
  await staff.getByLabel(new RegExp(`^${M}월 ${day}일`)).click();
  await staff.waitForTimeout(150);
}
const confirmLabel = await staff.getByRole("button", { name: /^확인 \(\d+곳\)$/ }).textContent();
confirmLabel?.includes("3곳")
  ? ok(`세 곳을 누르니 확인 버튼에 "${confirmLabel}" 로 표시됨`)
  : fail(`확인 버튼 표시가 이상함 ("${confirmLabel}")`);
await staff.screenshot({ path: `${OUT}/N1-draft.png` });

// ── 2. 취소하면 되돌아가는가 ────────────────────────
await staff.getByRole("button", { name: "취소" }).click();
await staff.waitForTimeout(800);
const countDays = async (page) => {
  let n = 0;
  for (const day of [d1, d2, d3]) {
    n += await page.getByLabel(new RegExp(`^${M}월 ${day}일, 근무 서연`)).count();
  }
  return n;
};
const afterCancel = await countDays(staff);
afterCancel === 0 ? ok("취소하니 넣던 것이 사라짐") : fail(`취소했는데 ${afterCancel}칸 남음`);

// ── 3. 확인을 누르면 한 번에 저장되는가 ─────────────
await staff.getByRole("button", { name: /이 시간으로 근무 등록/ }).click();
await staff.waitForTimeout(300);
for (const day of [d1, d2, d3]) {
  await staff.getByLabel(new RegExp(`^${M}월 ${day}일`)).click();
  await staff.waitForTimeout(150);
}
await staff.getByRole("button", { name: /^확인/ }).click();
await staff.waitForTimeout(1500);
const saved = await countDays(staff);
saved === 3 ? ok(`확인을 누르니 ${saved}칸 저장됨`) : fail(`저장이 안 됨 (${saved}칸)`);

// ── 4. 사장님에게 알림이 갔는가 (핵심) ──────────────
await owner.reload({ waitUntil: "networkidle" });
await owner.waitForTimeout(2000);
const badge = await owner.getByRole("button", { name: /알림 \d+개/ }).count();
badge > 0 ? ok("★ 사장님 알림 종에 개수가 뜸") : fail("★ 사장님에게 알림이 안 감");
await owner.screenshot({ path: `${OUT}/N2-owner-badge.png` });

// ── 5. 알림 내용이 맞는가 ───────────────────────────
await owner.getByRole("button", { name: /알림 \d+개/ }).click();
await owner.waitForTimeout(600);
const noticeText = await owner.getByText(/서연님이 .*근무.*넣었어요/).count();
noticeText > 0
  ? ok("★ 알림에 '누가 무엇을 했는지' 가 적힘")
  : fail("알림 내용이 없음");
await owner.screenshot({ path: `${OUT}/N3-notice-list.png` });

// ── 6. 넣었다 뺀 것은 알림에 안 남는가 ──────────────
// (2번에서 취소한 3곳은 기록되지 않아야 합니다)
const noticeCount = await owner.locator("p.text-xs.leading-5.text-slate-700").count();
noticeCount <= 2
  ? ok(`넣었다 뺀 과정은 안 남음 (알림 ${noticeCount}건)`)
  : fail(`알림이 너무 많음 (${noticeCount}건)`);

// ── 7. 확인하면 배지가 사라지는가 ───────────────────
await owner.getByRole("button", { name: "확인" }).click();
await owner.waitForTimeout(800);
const badgeGone = await owner.getByRole("button", { name: /알림 \d+개/ }).count();
badgeGone === 0 ? ok("확인하니 알림 개수가 사라짐") : fail("배지가 안 사라짐");

// ── 8. 사장님이 승인하면 알바생도 아는가 ────────────
await staff.goto(`${APP}/#/swaps`, { waitUntil: "networkidle" });
await staff.waitForTimeout(800);
await staff.getByRole("button", { name: /교대 신청/ }).click();
await staff.getByPlaceholder("예: 민수").fill("서연");
await staff.getByPlaceholder("예: 서연").fill("김사장");
await staff.getByRole("button", { name: "신청하기" }).click();
await staff.waitForTimeout(1500);

await owner.goto(`${APP}/#/swaps`, { waitUntil: "networkidle" });
await owner.waitForTimeout(1800);
const swapNotice = await owner.getByRole("button", { name: /알림 \d+개/ }).count();
swapNotice > 0 ? ok("★ 교대 신청도 사장님에게 알림이 감") : fail("교대 알림이 안 감");

await browser.close();
console.log("\n검사 끝");
