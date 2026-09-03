import { chromium } from "playwright";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * 사장님과 알바생이 진짜 브라우저 두 개에서 동시에 근무를 넣습니다.
 * 앱을 거쳐서 하는 검사입니다 (API 직접 호출이 아니라).
 */

const OUT = fileURLToPath(new URL("./결과/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";
const ok = (m) => console.log(`  OK   ${m}`);
const fail = (m) => { console.log(`  실패 ${m}`); process.exitCode = 1; };

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

// ── 사장님 ──────────────────────────────────────────────
const ownerCtx = await b.newContext(phone);
const owner = await ownerCtx.newPage();
await owner.goto(APP, { waitUntil: "networkidle" });
await owner.getByRole("button", { name: "매장 새로 열기" }).click();
await owner.getByPlaceholder("예: 우리 매장 성수점").fill("동시검사점");
await owner.getByRole("button", { name: "만들기" }).click();
await owner.getByText("처음 오셨네요").waitFor({ timeout: 20000 });
await owner.getByPlaceholder("예: 김사장").fill("김사장");
let pins = owner.locator('input[type="password"]');
await pins.nth(0).fill("1234"); await pins.nth(1).fill("1234");
await owner.getByRole("button", { name: "매장 시작하기" }).click();
await owner.waitForTimeout(2000);

await owner.goto(`${APP}/#/staff`, { waitUntil: "networkidle" });
await owner.waitForTimeout(1200);
await owner.getByRole("button", { name: /직원 추가/ }).click();
await owner.getByPlaceholder("예: 서연").fill("서연");
await owner.getByPlaceholder("0000").fill("1111");
await owner.getByRole("button", { name: "추가하기" }).click();
await owner.waitForTimeout(1200);
const code = (await owner.locator("p.tracking-\\[0\\.2em\\]").first().textContent())?.trim();
ok(`매장 준비 (${code})`);

// ── 알바생 ──────────────────────────────────────────────
const staffCtx = await b.newContext(phone);
const staff = await staffCtx.newPage();
await staff.goto(`${APP}/?store=${code}`, { waitUntil: "networkidle" });
await staff.getByText("누구세요?").waitFor({ timeout: 20000 });
await staff.getByLabel("이름").selectOption("서연");
await staff.locator('input[type="password"]').fill("1111");
await staff.getByRole("button", { name: "들어가기" }).click();
await staff.waitForTimeout(2000);

const now = new Date();
const M = now.getMonth() + 1, D = now.getDate();
const dOwner = D >= 27 ? D - 2 : D + 1;
const dStaff = D >= 27 ? D - 1 : D + 2;

await owner.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await staff.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await owner.waitForTimeout(2000);
await staff.waitForTimeout(2000);

// ── 둘이 같은 순간에 각자 근무를 넣습니다 ────────────────
const put = async (page, day) => {
  await page.getByRole("button", { name: /이 시간으로 근무 등록/ }).click();
  await page.waitForTimeout(300);
  await page.getByLabel(new RegExp(`^${M}월 ${day}일`)).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /^확인/ }).click();
};

await Promise.all([put(owner, dOwner), put(staff, dStaff)]);
await owner.waitForTimeout(4000);

// ── 둘 다 남았는가 ──────────────────────────────────────
const store = await (await fetch(`${APP}/api/stores/${code}/shifts`)).json();
console.log(`\n서버에 남은 근무 ${store.items.length}건`);
store.items.forEach((s) => console.log(`   ${s.workDate}  ${s.person}`));

store.items.length === 2
  ? ok("\n★ 동시에 넣었는데 둘 다 남았다")
  : fail(`\n★ ${2 - store.items.length}건이 사라졌다`);

// ── 서로의 화면에도 보이는가 (8초 안에) ──────────────────
await owner.waitForTimeout(9000);
const ownerSeesStaff = await owner.getByLabel(new RegExp(`^${M}월 ${dStaff}일, 근무 서연`)).count();
const staffSeesOwner = await staff.getByLabel(new RegExp(`^${M}월 ${dOwner}일, 근무 김사장`)).count();
ownerSeesStaff > 0 ? ok("사장님 화면에 알바생 근무가 나타났다") : fail("사장님 화면에 안 보임");
staffSeesOwner > 0 ? ok("알바생 화면에 사장님 근무가 나타났다") : fail("알바생 화면에 안 보임");

await owner.screenshot({ path: `${OUT}/T1-owner.png` });
await b.close();
console.log("\n검사 끝");
