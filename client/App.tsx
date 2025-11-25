import "./global.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { I18nProvider } from "./i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import DriverDashboard from "./pages/mobile/DriverDashboard";

const queryClient = new QueryClient();

const App: React.FC = () => (
  <I18nProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Global Toasts */}
        <Toaster />
        <Sonner />

        {/* Driver dashboard built with Builder.io */}
        <DriverDashboard />
      </TooltipProvider>
    </QueryClientProvider>
  </I18nProvider>
);

const container = document.getElementById("root");

if (container) {
  const anyWindow = window as any;
  let root = anyWindow.__REACT_APP_ROOT__;

  if (!root) {
    root = createRoot(container);
    anyWindow.__REACT_APP_ROOT__ = root;
  }

  root.render(<App />);
}
