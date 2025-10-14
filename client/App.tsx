import "./global.css";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { I18nProvider } from "./i18n";
import DriverApp from "./pages/mobile/DriverApp";
import DriverDashboard from "./pages/mobile/DriverDashboard";
import DriverLogin from "./pages/mobile/DriverLogin";
import DriverLogin from "./pages/mobile/DriverLogin";
import { Capacitor } from "@capacitor/core";

const queryClient = new QueryClient();

const NativeStartRedirect = () => {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    const isNative = (Capacitor as any)?.isNativePlatform?.() ?? false;
    if (isNative) {
      const p = loc.pathname || "/";
      if (p === "/" || p === "/login" || p === "/driver-login") {
        nav("/driver", { replace: true });
      }
    }
  }, [loc.pathname, nav]);
  return null;
};

const App = () => (
  <I18nProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <NativeStartRedirect />
          <Routes>
            <Route path="/" element={<Navigate to="/driver-login" replace />} />
            <Route path="/driver" element={<DriverApp />} />
            <Route path="/driver-dashboard" element={<DriverDashboard />} />
            <Route path="/driver-login" element={<DriverLogin />} />
            <Route path="*" element={<Navigate to="/driver-login" replace />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </I18nProvider>
);

// Ensure we only create a single root; reuse across HMR reloads to avoid multiple createRoot warnings
const container = document.getElementById("root");
if (container) {
  // store root on window to persist across HMR reloads
  const anyWin = window as any;
  let root = anyWin.__REACT_APP_ROOT__;
  if (!root) {
    root = createRoot(container);
    anyWin.__REACT_APP_ROOT__ = root;
  }
  root.render(<App />);
}
