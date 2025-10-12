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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
    typeof window !== "undefined" ? window.location.pathname : "/",
  );

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isActive = (p: string) => pathname === p;
  const [openUsers, setOpenUsers] = useState(pathname.startsWith("/users"));
  const [openEmployees, setOpenEmployees] = useState(
    pathname.startsWith("/employees"),
  );
  const [openSettings, setOpenSettings] = useState(
    pathname.startsWith("/settings"),
  );
  useEffect(() => {
    if (pathname.startsWith("/users")) setOpenUsers(true);
    if (pathname.startsWith("/employees")) setOpenEmployees(true);
    if (pathname.startsWith("/settings")) setOpenSettings(true);
  }, [pathname]);

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
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")}>
                  <Link to="/" className="flex items-center">
                    <span className="font-bold text-white">
                      {t("dashboard")}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/users")}>
                  <Link to="/users" className="flex items-center">
                    <span className="font-bold text-white">
                      {t("usersAuth")}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/missions")}>
                  <Link to="/missions" className="flex items-center">
                    <span className="font-bold text-white">
                      {t("missions")}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/employees")}>
                  <Link to="/employees" className="flex items-center">
                    <span className="font-bold text-white">
                      {t("employees")}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/sites")}>
                  <Link to="/sites" className="flex items-center">
                    <span className="font-bold text-white">{t("sites")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/reports")}>
                  <Link to="/reports" className="flex items-center">
                    <span className="font-bold text-white">{t("reports")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/notifications")}
                >
                  <Link to="/notifications" className="flex items-center">
                    <span className="font-bold text-white">
                      {t("notifications")}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")}>
                  <Link to="/settings" className="flex items-center">
                    <span className="font-bold text-white">
                      {t("settings")}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
