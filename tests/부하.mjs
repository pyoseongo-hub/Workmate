import { chromium } from "playwright";

/** 탭 하나가 60초 동안 서버를 몇 번 부르는지 실제로 셉니다. */
const APP = "http://localhost:3000";
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const calls = [];
page.on("request", (r) => { if (r.url().includes("/api/")) calls.push({ t: Date.now(), u: r.url().replace(APP, ""), m: r.method() }); });

// 매장 만들고 로그인
await page.goto(APP, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "매장 새로 열기" }).click();
await page.getByPlaceholder("예: 우리 매장 성수점").fill("부하검사점");
await page.getByRole("button", { name: "만들기" }).click();
await page.getByText("처음 오셨네요").waitFor({ timeout: 20000 });
await page.getByPlaceholder("예: 김사장").fill("사장");
const pins = page.locator('input[type="password"]');
await pins.nth(0).fill("1234"); await pins.nth(1).fill("1234");
await page.getByRole("button", { name: "매장 시작하기" }).click();
await page.waitForTimeout(2500);

await page.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

// ── 여기서부터 60초 센다 ──
calls.length = 0;
const t0 = Date.now();
await page.waitForTimeout(60000);
const secs = (Date.now() - t0) / 1000;

const gets = calls.filter((c) => c.m === "GET");
console.log(`\n근무표 화면을 켜 두기만 한 60초 동안`);
console.log(`  서버 호출  ${calls.length}회  (초당 ${(calls.length / secs).toFixed(2)}회)`);
console.log(`  그중 GET   ${gets.length}회`);
const byUrl = {};
for (const c of calls) byUrl[`${c.m} ${c.u}`] = (byUrl[`${c.m} ${c.u}`] ?? 0) + 1;
for (const [k, v] of Object.entries(byUrl)) console.log(`    ${v.toString().padStart(3)}회  ${k}`);

await b.close();
