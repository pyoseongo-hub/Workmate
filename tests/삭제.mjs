import { chromium } from "playwright";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * 삭제가 정말 되는지 검사합니다.
 *
 * 1부 — 진단이 맞았나: 안전 상자(sandbox) 안에서 confirm() 이 정말 막히는가
 * 2부 — 고친 게 되나: 앱이 직접 그린 확인 창으로 네 곳이 다 지워지는가
 */

const OUT = fileURLToPath(new URL("./결과/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";

const browser = await chromium.launch({
  // 크로뮴 위치. 안 주면 playwright 가 깔아 둔 것을 씁니다 (pnpm exec playwright install chromium)
  executablePath: process.env.CHROME_PATH || undefined,
});

const ok = (m) => console.log(`  OK   ${m}`);
const fail = (m) => { console.log(`  실패 ${m}`); process.exitCode = 1; };

// ═══════════ 1부 · 진단 확인 ═══════════
console.log("\n[1부] 안전 상자 안에서 브라우저 confirm() 이 어떻게 되나\n");
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.setContent(
    `<iframe id="f" sandbox="allow-scripts allow-same-origin" srcdoc="<p>안전 상자</p>"></iframe>`
  );
  await p.waitForTimeout(500);
  // 상자 안쪽에서 confirm() 을 불러 봅니다. 창이 뜨면 여기서 멈춰야 정상입니다.
  const inside = p.frames().find((f) => f !== p.mainFrame());
  const result = await inside.evaluate(() => confirm("지울까요?"));
  result === false
    ? ok("★ confirm() 이 창도 안 띄우고 조용히 false(=취소) 를 돌려줌 — 진단 맞음")
    : fail(`confirm() 이 ${result} 를 돌려줌 (예상과 다름)`);
  await ctx.close();
}

// ═══════════ 2부 · 고친 것 검사 ═══════════
console.log("\n[2부] 앱이 직접 그린 확인 창으로 지워지나\n");

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

// 브라우저 창이 뜨면 일부러 "취소" 를 누릅니다.
// 예전 코드가 남아 있으면 여기서 걸려 아무것도 안 지워집니다.
page.on("dialog", (d) => { console.log("  ⚠️ 브라우저 창이 떴다 (남아 있는 confirm)"); d.dismiss(); });

await page.goto(APP, { waitUntil: "networkidle" });
await page.getByText("시작하기").waitFor({ timeout: 20000 });
await page.getByRole("button", { name: "매장 새로 열기" }).click();
await page.getByPlaceholder("예: 우리 매장 성수점").fill("삭제검사점");
await page.getByRole("button", { name: "만들기" }).click();
await page.getByText("처음 오셨네요").waitFor({ timeout: 20000 });
await page.getByPlaceholder("예: 김사장").fill("표성오");
const pins = page.locator('input[type="password"]');
await pins.nth(0).fill("1234");
await pins.nth(1).fill("1234");
await page.getByRole("button", { name: "매장 시작하기" }).click();
await page.waitForTimeout(2000);
ok("매장 준비");

const now = new Date();
const M = now.getMonth() + 1;
const D = now.getDate();
const target = D >= 28 ? D - 1 : D + 1;
const cell = new RegExp(`^${M}월 ${target}일, 근무 표성오`);

// ── 근무 넣기 ───────────────────────────────────────────
await page.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /이 시간으로 근무 등록/ }).click();
await page.waitForTimeout(400);
await page.getByLabel(new RegExp(`^${M}월 ${target}일`)).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /^확인/ }).click();
await page.waitForTimeout(1800);

(await page.getByLabel(cell).count()) === 1
  ? ok(`${M}월 ${target}일 근무 등록됨`)
  : fail("등록이 안 됨");

// ── 지우기 ──────────────────────────────────────────────
await page.getByLabel(new RegExp(`^${M}월 ${target}일`)).click();
await page.waitForTimeout(800);
await page.locator("button:has(svg.lucide-trash2)").first().click();
await page.waitForTimeout(700);

(await page.getByText("잠깐만요").count()) > 0
  ? ok("★ 앱이 그린 확인 창이 떴다")
  : fail("★ 확인 창이 안 뜸");
await page.screenshot({ path: `${OUT}/D1-confirm.png` });

// ── "그냥 둘게요" 는 안 지워야 한다 ──────────────────────
await page.getByRole("button", { name: "그냥 둘게요" }).click();
await page.waitForTimeout(1000);
(await page.getByLabel(cell).count()) === 1
  ? ok("그냥 둘게요 → 안 지워짐")
  : fail("취소했는데 지워짐");

// ── "지울게요" 는 지워야 한다 ───────────────────────────
await page.locator("button:has(svg.lucide-trash2)").first().click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: "지울게요" }).click();
await page.waitForTimeout(1800);
(await page.getByLabel(cell).count()) === 0
  ? ok("★ 지울게요 → 근무가 사라짐")
  : fail("★ 눌렀는데 안 지워짐");
await page.screenshot({ path: `${OUT}/D2-deleted.png` });

// ── 새로고침해도 안 돌아오나 (서버에도 반영됐나) ─────────
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2500);
(await page.getByLabel(cell).count()) === 0
  ? ok("새로고침해도 안 돌아옴 (서버에도 반영)")
  : fail("새로고침하니 되살아남");

// ── 직원 한 명 추가 (교대 상대가 있어야 신청이 됩니다) ───
await page.goto(`${APP}/#/staff`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /직원 추가/ }).click();
await page.waitForTimeout(500);
await page.getByPlaceholder("예: 서연").fill("서연");
await page.getByPlaceholder("0000").fill("1111");
await page.getByRole("button", { name: "추가하기" }).click();
await page.waitForTimeout(1500);

// ── 교대 요청 없애기 ────────────────────────────────────
// (신청 버튼은 근무표 화면 위쪽에 있습니다. 교대 관리 화면은 사장님에게 숨깁니다)
await page.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
// 신청 버튼은 날짜를 골라야 위쪽 띠에 나타납니다.
await page.getByLabel(new RegExp(`^${M}월 ${target}일`)).click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: /교대 신청/ }).first().click();
await page.waitForTimeout(700);
await page.getByPlaceholder("예: 민수").fill("표성오");
await page.getByPlaceholder("예: 서연").fill("서연");
await page.getByRole("button", { name: "신청하기" }).click();
await page.waitForTimeout(1800);

const swapTrash = page.locator('button[aria-label*="교대 요청 없애기"]');
if ((await swapTrash.count()) === 0) {
  fail("교대 요청이 안 만들어져서 검사 못 함");
} else {
  await swapTrash.first().click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "지울게요" }).click();
  await page.waitForTimeout(1800);
  (await page.locator('button[aria-label*="교대 요청 없애기"]').count()) === 0
    ? ok("★ 교대 요청도 지워짐")
    : fail("★ 교대 요청이 안 지워짐");
}

// ── 직원 삭제 ───────────────────────────────────────────
await page.goto(`${APP}/#/staff`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const before = await page.getByText("서연", { exact: true }).count();
await page.getByRole("button", { name: "삭제" }).last().click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: "지울게요" }).click();
await page.waitForTimeout(1800);
const after = await page.getByText("서연", { exact: true }).count();
after < before ? ok("★ 직원도 지워짐") : fail(`★ 직원이 안 지워짐 (${before}→${after})`);
await page.screenshot({ path: `${OUT}/D3-staff.png` });

// ── 근무일지 지우기 ─────────────────────────────────────
await page.goto(`${APP}/#/worklog`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "근무일지 작성" }).first().click();
await page.waitForTimeout(700);
const logDate = page.locator('input[type="date"]').first();
if (await logDate.count()) await logDate.fill(`${now.getFullYear()}-${String(M).padStart(2, "0")}-${String(target).padStart(2, "0")}`);
const times = page.locator('input[type="time"]');
for (let i = 0; i < (await times.count()); i += 1) await times.nth(i).fill(i % 2 === 0 ? "09:00" : "18:00");
await page.getByRole("button", { name: "저장하기" }).last().click();
await page.waitForTimeout(1800);

const logTrash = page.locator("button:has(svg.lucide-trash2)");
if ((await logTrash.count()) === 0) {
  fail("근무일지가 안 만들어져서 검사 못 함");
} else {
  const n = await logTrash.count();
  await logTrash.first().click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "지울게요" }).click();
  await page.waitForTimeout(1800);
  (await page.locator("button:has(svg.lucide-trash2)").count()) < n
    ? ok("★ 근무일지도 지워짐")
    : fail("★ 근무일지가 안 지워짐");
}

await browser.close();
console.log("\n검사 끝");
