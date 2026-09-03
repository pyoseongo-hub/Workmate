import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * 화면(client/)을 빌드하는 설정입니다.
 *
 * 2026-09-03 에 이 프로젝트를 만든 도구(Manus)용 플러그인을 걷어냈습니다.
 * 화면을 들여다보려고 358KB 짜리 스크립트를 끼워 넣던 것으로,
 * 배포판에서는 쓸 일이 없습니다.
 *
 * 덕분에 개발할 때와 빌드할 때 설정이 같아져 NODE_ENV 를 따로 줄 필요가
 * 없어졌고, 윈도우에서도 `pnpm build` 가 그대로 됩니다.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  // 파일을 상대 경로로 찾게 합니다.
  // 하위 폴더(예: /workmate/)에 올려도 흰 화면이 되지 않습니다.
  base: "./",
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    fs: { strict: true, deny: ["**/.*"] },
    // 개발 서버(pnpm dev)에서도 매장 API 가 되게 진짜 서버로 넘깁니다.
    // 따로 `pnpm dev:server` 를 켜 두어야 합니다.
    proxy: { "/api": "http://localhost:3000" },
  },
});
