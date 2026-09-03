import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RoleProvider } from "./contexts/RoleContext";
import { LoginGate } from "./components/LoginGate";

import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import WorkLog from "./pages/WorkLog";
import Swaps from "./pages/Swaps";
import Staff from "./pages/Staff";
import Guide from "./pages/Guide";
import Share from "./pages/Share";
import NotFound from "@/pages/NotFound";

/**
 * 주소(URL)와 화면을 연결하는 표입니다.
 *
 *   #/           → 대시보드
 *   #/schedule   → 근무표
 *   #/worklog    → 근무일지
 *   #/swaps      → 교대 관리
 *   #/staff      → 직원 관리 (사장님 전용)
 *   #/guide      → 사용법
 *
 * 사이드바 메뉴는 layouts/AppLayout.tsx 의 MENU 목록에 있습니다.
 * 화면을 새로 만들 때는 두 곳을 다 고쳐야 합니다.
 *
 * 왜 주소에 # 을 붙이나:
 *   # 이 없는 주소(/schedule)는 서버가 "그 주소도 앱으로 보내 줘야" 동작합니다.
 *   설정이 빠지면 새로고침할 때 404가 납니다.
 *   # 뒤쪽은 서버로 가지 않으므로, 파일 하나만 열든 무료 호스팅에 올리든
 *   어디서나 그대로 동작합니다.
 */
function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/worklog" component={WorkLog} />
        <Route path="/swaps" component={Swaps} />
        <Route path="/staff" component={Staff} />
        <Route path="/guide" component={Guide} />

        {/* 카톡 등으로 공유한 근무표를 여는 주소 */}
        <Route path="/share/:id" component={Share} />

        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        {/* RoleProvider: 지금 들어와 있는 사람이 누구인지 앱 전체에서 공유합니다 */}
        <RoleProvider>
          {/* LoginGate: 이름과 번호로 들어오기 전에는 앱 화면을 보여주지 않습니다 */}
          <LoginGate>
            <TooltipProvider>
              <Toaster />
              <AppRouter />
            </TooltipProvider>
          </LoginGate>
        </RoleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
