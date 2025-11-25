import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";
import { useEffect, useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const [pathname, setPathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isActive = (p: string) => pathname === p;
  const { t } = useI18n();

  return (
    <Sidebar
      className="bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]"
      collapsible="icon"
    >
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center">
          <Link to="/" className="select-none">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2Fdf60032fd7d44277b7f568b8478ff12e?format=webp&width=800"
              alt="ACES"
              className="h-12 w-auto"
              loading="eager"
              decoding="async"
            />
          </Link>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { to: "/", label: t("dashboard") },
                { to: "/users", label: t("usersAuth") },
                { to: "/missions", label: t("missions") },
                { to: "/employees", label: t("employees") },
                { to: "/sites", label: t("sites") },
                { to: "/reports", label: t("reports") },
                { to: "/notifications", label: t("notifications") },
                { to: "/settings", label: t("settings") },
              ].map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)}>
                    <Link to={item.to} className="flex items-center">
                      <span className="font-bold text-white">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
