import Header from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { Link } from "react-router-dom";
import { ShieldCheck, Users2 } from "lucide-react";

export default function UsersIndexPage() {
  const { t } = useI18n();
  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 text-sm text-muted-foreground">{t("usersAuth")}</div>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link to="/users/admins" className="block">
                <Button variant="default" className="w-full h-24 text-lg">
                  <Users2 className="mr-2 h-5 w-5" /> {t("adminUsers")}
                </Button>
              </Link>
              <Link to="/users/authorizations" className="block">
                <Button variant="outline" className="w-full h-24 text-lg">
                  <ShieldCheck className="mr-2 h-5 w-5" /> {t("authorizations")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
