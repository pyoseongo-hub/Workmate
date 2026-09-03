import { chromium } from "playwright";

/**
 * 번호(PIN)가 정말 서버에만 있는지 검사합니다. (2026-09-03)
 *
 *   · 직원 관리 화면에도, 서버 응답에도 번호가 안 보이나
 *   · 틀린 번호는 막고 맞는 번호는 들이나
 *   · 이름만 고치면 번호가 그대로 남나
 *   · 번호를 바꾸면 옛 번호는 막히나
 *
 * 먼저 서버를 띄웁니다: pnpm build && PORT=3000 node dist/server.js
 */

const APP = "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

const ok = (m) => console.log(`  OK   ${m}`);
const fail = (m) => { console.log(`  실패 ${m}`); process.exitCode = 1; };

/** 새 기기처럼 (저장된 것이 없는 브라우저) 매장 코드로 들어가 이름·번호를 넣습니다. */
async function signIn(name, pin, code) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${APP}/?store=${code}`, { waitUntil: "networkidle" });
  await p.getByText("누구세요?").waitFor({ timeout: 20000 });
  await p.selectOption("select", name);
  await p.locator('input[type="password"]').fill(pin);
  await p.getByRole("button", { name: "들어가기" }).click();
  await p.waitForTimeout(1500);
  const wrong = (await p.getByText("이름과 번호가 맞지 않습니다").count()) > 0;
  // 로그인 화면에도 "근무표" 글자가 있어서, "누구세요?" 가 사라졌는지로 봅니다.
  const inside = (await p.getByText("누구세요?").count()) === 0;
  await ctx.close();
  return { wrong, inside };
}

// ── 사장님이 매장을 열고 직원을 넣습니다 ────────────────────────
const owner = await (await browser.newContext()).newPage();
await owner.goto(APP, { waitUntil: "networkidle" });
await owner.getByText("시작하기").waitFor({ timeout: 20000 });
await owner.getByRole("button", { name: "매장 새로 열기" }).click();
await owner.getByPlaceholder("예: 우리 매장 성수점").fill("번호검사점");
await owner.getByRole("button", { name: "만들기" }).click();
await owner.getByText("처음 오셨네요").waitFor({ timeout: 20000 });
await owner.getByPlaceholder("예: 김사장").fill("표성오");
const pins = owner.locator('input[type="password"]');
await pins.nth(0).fill("1234");
await pins.nth(1).fill("1234");
await owner.getByRole("button", { name: "매장 시작하기" }).click();
await owner.waitForTimeout(2000);
const code = await owner.evaluate(() => localStorage.getItem("workmate-store-code"));
ok(`매장 준비 (${code})`);

await owner.goto(`${APP}/#/staff`, { waitUntil: "networkidle" });
await owner.waitForTimeout(1000);
await owner.getByRole("button", { name: "직원 추가" }).click();
await owner.getByPlaceholder("예: 서연").fill("서연");
await owner.getByPlaceholder("0000").fill("4321");
await owner.getByRole("button", { name: "추가하기" }).click();
await owner.waitForTimeout(2000);

(await owner.getByText("서연").count()) > 0 ? ok("직원 서연 추가됨") : fail("직원이 안 보임");
(await owner.getByText("4321").count()) === 0
  ? ok("★ 직원 관리 화면에 번호가 안 보인다")
  : fail("★ 화면에 번호가 그대로 보인다");

// ── 서버 응답에도 번호가 없어야 합니다 ─────────────────────────
const members = await fetch(`${APP}/api/stores/${code}/members`).then((r) => r.json());
members.items.every((m) => m.pin === "")
  ? ok("★ 서버 응답에 번호가 없다 (전부 빈 칸)")
  : fail(`★ 서버 응답에 번호가 들어 있다: ${JSON.stringify(members.items)}`);

// ── 알바생이 다른 기기에서 들어옵니다 ─────────────────────────
let r = await signIn("서연", "0000", code);
r.wrong && !r.inside ? ok("틀린 번호는 막힌다") : fail("틀린 번호로 들어가졌다");

r = await signIn("서연", "4321", code);
r.inside ? ok("맞는 번호로 들어간다") : fail("맞는 번호인데 못 들어감");

// ── 사장님이 이름만 고칩니다 (번호 칸은 비워 둠) ────────────────
await owner.getByRole("button", { name: "수정" }).nth(1).click();
await owner.getByPlaceholder("예: 서연").fill("서연2");
await owner.getByRole("button", { name: "수정하기" }).click();
await owner.waitForTimeout(2000);
(await owner.getByText("서연2").count()) > 0 ? ok("이름을 서연2 로 고침") : fail("이름이 안 바뀜");

r = await signIn("서연2", "4321", code);
r.inside ? ok("★ 이름만 고쳐도 번호는 그대로") : fail("★ 이름을 고쳤더니 번호가 날아감");

// ── 사장님이 번호를 바꿉니다 ───────────────────────────────────
await owner.getByRole("button", { name: "수정" }).nth(1).click();
await owner.getByPlaceholder("비워 두면 그대로").fill("9999");
await owner.getByRole("button", { name: "수정하기" }).click();
await owner.waitForTimeout(2000);

r = await signIn("서연2", "4321", code);
r.wrong ? ok("옛 번호는 막힌다") : fail("옛 번호로 아직 들어가진다");
r = await signIn("서연2", "9999", code);
r.inside ? ok("★ 새 번호로 들어간다") : fail("★ 새 번호가 안 먹는다");

await browser.close();
console.log(process.exitCode ? "\n❌ 실패한 항목이 있습니다" : "\n✅ 번호는 서버에만 있습니다");
