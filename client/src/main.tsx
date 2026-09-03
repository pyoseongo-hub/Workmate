import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * 앱의 출발점입니다.
 *
 * 서비스 워커(public/sw.js)는 배포판에서만 등록합니다.
 * 홈 화면에 설치한 뒤 인터넷이 잠깐 끊겨도 마지막 화면을 보여 주기 위한 것입니다.
 *
 * 2026-09-03 에 tRPC·로그인(OAuth) 연결을 걷어냈습니다.
 * 이 프로젝트를 만든 도구(Manus)용이었고, 지금 화면은 server/app.ts 의
 * 매장 API 만 씁니다(client/src/lib/store.ts).
 */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

createRoot(document.getElementById("root")!).render(<App />);
