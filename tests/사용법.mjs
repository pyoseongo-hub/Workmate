import { chromium } from "playwright";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("./결과/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();

await p.goto(APP, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "매장 새로 열기" }).click();
await p.getByPlaceholder("예: 우리 매장 성수점").fill("설명서검사점");
await p.getByRole("button", { name: "만들기" }).click();
await p.getByText("처음 오셨네요").waitFor({ timeout: 20000 });
await p.getByPlaceholder("예: 김사장").fill("표성오");
const pins = p.locator('input[type="password"]');
await pins.nth(0).fill("1234");
await pins.nth(1).fill("1234");
await p.getByRole("button", { name: "매장 시작하기" }).click();
await p.waitForTimeout(2500);

// 메뉴에서 '사용법' 을 눌러 들어간다
await p.getByRole("button", { name: "메뉴" }).click();
await p.waitForTimeout(500);
const link = p.getByRole("button", { name: "사용법" });
console.log((await link.count()) > 0 ? "  OK   메뉴에 '사용법' 이 있다" : "  실패 메뉴에 없다");
await link.click();
await p.waitForTimeout(1500);
console.log(p.url().includes("/guide") ? "  OK   사용법 화면으로 이동함" : `  실패 주소가 ${p.url()}`);
console.log((await p.getByText("이 앱이 하는 일").count()) > 0 ? "  OK   내용이 보인다" : "  실패 내용 없음");

// 접힌 질문 열어 보기
await p.getByText("번호를 잊었어요").click();
await p.waitForTimeout(400);
console.log((await p.getByText(/직원 관리.*에서 볼 수 있습니다/).count()) > 0
  ? "  OK   질문이 펼쳐진다"
  : "  실패 안 펼쳐짐");

// 가로 스크롤이 생기지 않는가 (폰에서 표 때문에 흔한 사고)
const overflow = await p.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(overflow <= 1 ? "  OK   폰에서 가로로 안 밀린다" : `  실패 가로로 ${overflow}px 밀림`);

await p.screenshot({ path: `${OUT}/G1-guide.png`, fullPage: true });
await b.close();
console.log("\n검사 끝");
