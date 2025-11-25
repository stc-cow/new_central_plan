// ------------------------------
// ACES Fuel Driver App - Entry
// ------------------------------
// Framework: React + Vite + Capacitor
// Author: eng.altieb@aces-co.com
// Description:
// Standalone Driver Mobile App for ACES Fuel operations,
// providing native navigation, login, and task dashboard.
// ------------------------------

import "./global.css";

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Capacitor } from "@capacitor/core";

// ----------- Global Providers -----------
import { I18nProvider } from "./i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// ----------- App Screens -----------
import DriverApp from "./pages/mobile/DriverApp";
import DriverDashboard from "./pages/mobile/DriverDashboard";
import DriverTasks from "./pages/mobile/DriverTasks";
import DriverLogin from "./pages/mobile/DriverLogin";

// ----------- React Query Setup -----------
const queryClient = new QueryClient();

// ----------- Native Redirect Handler -----------
const NativeStartRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Detect native runtime (Capacitor WebView)
    const isNative = (Capacitor as any)?.isNativePlatform?.() ?? false;

    if (isNative) {
      const path = location.pathname || "/";
      // Redirect to main driver view on native startup
      if (["/", "/login", "/driver-login"].includes(path)) {
        navigate("/driver", { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return null;
};

// ----------- App Root Container -----------
const App: React.FC = () => (
  <I18nProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Global Toasts */}
        <Toaster />
        <Sonner />

        {/* Routing Layer */}
        <HashRouter>
          <NativeStartRedirect />

          <Routes>
            <Route path="/" element={<Navigate to="/driver-login" replace />} />
            <Route path="/driver" element={<DriverApp />} />
            <Route path="/driver-dashboard" element={<DriverDashboard />} />
            <Route path="/driver-tasks" element={<DriverTasks />} />
            <Route path="/driver-login" element={<DriverLogin />} />
            {/* Wildcard route fallback */}
            <Route path="*" element={<Navigate to="/driver-login" replace />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </I18nProvider>
);

// ----------- React Root Mount Logic -----------
const container = document.getElementById("root");

if (container) {
  // Persist root across HMR (important for Builder preview + Vite dev)
  const anyWindow = window as any;
  let root = anyWindow.__REACT_APP_ROOT__;

  if (!root) {
    root = createRoot(container);
    anyWindow.__REACT_APP_ROOT__ = root;
  }

  root.render(<App />);
}
