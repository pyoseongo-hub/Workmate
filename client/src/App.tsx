import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RoleProvider } from "./contexts/RoleContext";

import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import WorkLog from "./pages/WorkLog";
import Swaps from "./pages/Swaps";
import Staff from "./pages/Staff";
import Share from "./pages/Share";
import NotFound from "@/pages/NotFound";

/**
 * 주소(URL)와 화면을 연결하는 표입니다.
 *
 *   /           → 대시보드
 *   /schedule   → 근무표
 *   /worklog    → 근무일지
 *   /swaps      → 교대 관리
 *   /staff      → 직원 관리 (사장님 전용)
 *
 * 사이드바 메뉴는 layouts/AppLayout.tsx 의 MENU 목록에 있습니다.
 * 화면을 새로 만들 때는 두 곳을 다 고쳐야 합니다.
 */
function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/worklog" component={WorkLog} />
      <Route path="/swaps" component={Swaps} />
      <Route path="/staff" component={Staff} />

      {/* 카톡 등으로 공유한 근무표를 여는 주소 */}
      <Route path="/share/:id" component={Share} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        {/* RoleProvider: 사장님/알바생 모드를 앱 전체에서 공유합니다 */}
        <RoleProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </RoleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
