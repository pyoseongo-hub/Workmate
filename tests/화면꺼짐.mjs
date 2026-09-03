import { chromium } from "playwright";
const APP = "http://localhost:3000";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const calls = [];
p.on("request", (r) => { if (r.url().includes("/api/")) calls.push(r.url()); });

await p.goto(APP, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "매장 새로 열기" }).click();
await p.getByPlaceholder("예: 우리 매장 성수점").fill("숨김검사점");
await p.getByRole("button", { name: "만들기" }).click();
await p.getByText("처음 오셨네요").waitFor({ timeout: 20000 });
await p.getByPlaceholder("예: 김사장").fill("사장");
const pins = p.locator('input[type="password"]');
await pins.nth(0).fill("1234"); await pins.nth(1).fill("1234");
await p.getByRole("button", { name: "매장 시작하기" }).click();
await p.waitForTimeout(2000);
await p.goto(`${APP}/#/schedule`, { waitUntil: "networkidle" });
await p.waitForTimeout(2000);

// 화면을 보고 있을 때 30초
calls.length = 0;
await p.waitForTimeout(30000);
const 보는중 = calls.length;

// 다른 탭으로 간 척 (화면을 안 봄) 30초
await p.evaluate(() => {
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
});
calls.length = 0;
await p.waitForTimeout(30000);
const 숨김 = calls.length;

// 돌아왔을 때 바로 확인하는가
calls.length = 0;               // ← 돌리기 '전에' 비운다
await p.evaluate(() => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
});
await p.waitForTimeout(1500);   // 8초 기다리지 않고 바로 부르는지만 본다
const 돌아옴 = calls.length;

console.log(`\n  화면을 보고 있을 때 30초:  ${보는중}회`);
console.log(`  다른 탭으로 갔을 때 30초:  ${숨김}회`);
console.log(`  돌아온 직후 1.5초:         ${돌아옴}회`);
console.log(숨김 === 0 ? "\n  OK   안 볼 때는 멈춘다" : `\n  실패 안 보는데도 ${숨김}회 부름`);
console.log(돌아옴 > 0 ? "  OK   돌아오면 8초 안 기다리고 바로 확인한다" : "  실패 돌아와도 확인 안 함");
await b.close();
