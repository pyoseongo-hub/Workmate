/**
 * 빌드 결과를 "파일 하나짜리 HTML"로 합칩니다.
 *
 *   pnpm build && node scripts/make-preview.mjs
 *   → preview/workmate-preview.html
 *
 * 왜 필요한가:
 *   서버 없이 파일 하나만 열면 앱이 도는 미리보기를 만들기 위해서입니다.
 *   폰으로 링크를 열어 화면을 확인할 때 씁니다.
 *
 * 무엇을 빼는가:
 *   · 개발 도구 스크립트(manus-runtime) — 358KB나 되고 미리보기에는 필요 없습니다.
 *   · 통계 스크립트 — 주소가 채워지지 않은 채 남아 있어 깨진 링크가 됩니다.
 *   · manifest / service worker 링크 — 파일 하나만 열 때는 없는 주소입니다.
 *
 * 주의:
 *   지금 앱은 자료를 브라우저에만 저장하므로 서버 없이도 잘 돕니다.
 *   서버에 저장하도록 바꾼 뒤에는 이 미리보기로 저장 기능을 확인할 수 없습니다.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist", "public");
const outDir = join(root, "preview");

const html = readFileSync(join(distDir, "index.html"), "utf8");

// ── 1. 붙여 넣을 JS·CSS 파일 이름을 HTML에서 찾아냅니다 ──────────────
const jsName = html.match(/src="\/assets\/(index-[\w-]+\.js)"/)?.[1];
const cssName = html.match(/href="\/assets\/(index-[\w-]+\.css)"/)?.[1];

if (!jsName || !cssName) {
  console.error("빌드 결과에서 JS/CSS 파일을 찾지 못했습니다. 먼저 pnpm build 를 실행하세요.");
  process.exit(1);
}

const js = readFileSync(join(distDir, "assets", jsName), "utf8");
const css = readFileSync(join(distDir, "assets", cssName), "utf8");

// ── 2. <head> 안에서 살릴 것만 골라냅니다 ───────────────────────────
// 폰트 링크는 살립니다. 글꼴이 없으면 화면이 달라 보입니다.
const fontLinks = [...html.matchAll(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>/g)]
  .map((match) => match[0])
  .join("\n");

const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "WorkMate";
const description =
  html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";

// ── 3. 합칩니다 ────────────────────────────────────────────────────
// JS 안에 </script> 라는 글자가 있으면 거기서 스크립트가 끊깁니다. 막아 둡니다.
const safeJs = js.replace(/<\/script>/gi, "<\\/script>");

const output = `<title>${title}</title>
<meta name="description" content="${description}" />
${fontLinks}
<style>
/* 이 앱은 밝은 화면 하나로 디자인되어 있습니다.
   보는 사람의 브라우저가 어두운 테마여도 앱 배경이 그대로 나오도록 못 박습니다.
   이걸 빼면 어두운 바탕 위에 밝은 카드가 떠서 가장자리가 어색해집니다. */
html, body { margin: 0; background: #f6f8fb; color-scheme: light; }
</style>
<style>
${css}
</style>

<div id="root"></div>

<script type="module">
${safeJs}
</script>
`;

mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "workmate-preview.html");
writeFileSync(outPath, output, "utf8");

const kb = (value) => `${(value / 1024).toFixed(0)}KB`;
console.log(`만들었습니다: ${outPath}`);
console.log(`  CSS ${kb(css.length)} + JS ${kb(js.length)} → 합계 ${kb(output.length)}`);
console.log(`  (원래 index.html 은 ${kb(html.length)} — 개발 도구 스크립트를 뺐습니다)`);
