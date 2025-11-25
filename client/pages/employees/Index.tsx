import Header from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { Link } from "react-router-dom";
import { Truck, Wrench } from "lucide-react";

export default function EmployeesIndexPage() {
  const { t } = useI18n();
  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 text-sm text-muted-foreground">{t("employees")}</div>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link to="/employees/drivers" className="block">
                <Button variant="default" className="w-full h-24 text-lg">
                  <Truck className="mr-2 h-5 w-5" /> {t("drivers")}
                </Button>
              </Link>
              <Link to="/employees/technicians" className="block">
                <Button variant="outline" className="w-full h-24 text-lg">
                  <Wrench className="mr-2 h-5 w-5" /> {t("technicians")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
