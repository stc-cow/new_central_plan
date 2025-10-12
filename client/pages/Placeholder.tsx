import Header from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppSidebar";
import PlaceholderPage from "@/components/layout/PlaceholderPage";
import { useEffect, useState } from "react";

const TITLES: Record<string, string> = {
  "/users": "Users & authorization",
  "/users/admins": "Admin Users",
  "/users/authorizations": "Authorizations",
  "/missions": "Missions",
  "/employees": "Employees",
  "/employees/drivers": "Drivers",
  "/employees/technicians": "Technicians",
  "/sites": "Sites",
  "/generators": "Generators",
  "/reports": "Reports",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/settings/cities": "Cities",
  "/settings/zones": "Zones",
  "/settings/admin-log": "Admin Log",
};

export default function Placeholder() {
  const [pathname, setPathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/",
  );

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const title = TITLES[pathname] || pathname.replace("/", "");
  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-6">
        <PlaceholderPage title={title} />
      </div>
    </AppShell>
  );
}
