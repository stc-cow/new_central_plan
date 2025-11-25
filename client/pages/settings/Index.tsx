import Header from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { Link } from "react-router-dom";
import {
  Settings as SettingsIcon,
  MapPin,
  Grid,
  ListChecks,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type SettingItem = {
  id: string;
  to: string;
  icon: "settings" | "map" | "grid" | "list";
  labelKey: string;
  customLabel?: string;
  hidden?: boolean;
  variant?: "default" | "outline";
};

export default function SettingsIndexPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<SettingItem[]>([
    {
      id: "general",
      to: "/settings/general",
      icon: "settings",
      labelKey: "settingsGeneral",
      variant: "default",
    },
    { id: "cities", to: "/settings/cities", icon: "map", labelKey: "settingsCities", variant: "outline" },
    { id: "zones", to: "/settings/zones", icon: "grid", labelKey: "settingsZones", variant: "outline" },
    { id: "admin-log", to: "/settings/admin-log", icon: "list", labelKey: "settingsAdminLog", variant: "outline" },
  ]);

  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setEditId(id);
    setEditValue(it.customLabel ?? t(it.labelKey));
  };

  const saveEdit = () => {
    if (!editId) return;
    const value = editValue.trim();
    setItems((arr) => arr.map((x) => (x.id === editId ? { ...x, customLabel: value || undefined } : x)));
    setEditId(null);
  };

  const remove = (id: string) => setItems((arr) => arr.filter((x) => x.id !== id));
  const toggleHidden = (id: string) =>
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)));

  const iconFor = (icon: SettingItem["icon"]) => {
    switch (icon) {
      case "settings":
        return <SettingsIcon className="mr-2 h-5 w-5" />;
      case "map":
        return <MapPin className="mr-2 h-5 w-5" />;
      case "grid":
        return <Grid className="mr-2 h-5 w-5" />;
      case "list":
        return <ListChecks className="mr-2 h-5 w-5" />;
    }
  };

  const visibleItems = useMemo(() => items, [items]);

  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 text-sm text-muted-foreground">{t("settings")}</div>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleItems.map((item) => {
                const label = item.customLabel ?? t(item.labelKey);
                const ButtonContent = (
                  <Button variant={item.variant ?? "outline"} className="w-full h-20">
                    {iconFor(item.icon)} {label}
                  </Button>
                );
                return (
                  <div key={item.id} className="block">
                    {item.hidden ? (
                      <div className="w-full">
                        <div className="w-full cursor-not-allowed opacity-50">{ButtonContent}</div>
                      </div>
                    ) : (
                      <Link to={item.to} className="block">
                        {ButtonContent}
                      </Link>
                    )}
                    <div className="mt-2 flex justify-end gap-2">
                      <Button size="icon" variant="ghost" aria-label={t("edit")} onClick={() => startEdit(item.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={item.hidden ? t("show") : t("hide")} onClick={() => toggleHidden(item.id)}>
                        {item.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={t("delete")} onClick={() => remove(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editSetting")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="setting-name">{t("settingName")}</Label>
              <Input id="setting-name" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditId(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={saveEdit}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
