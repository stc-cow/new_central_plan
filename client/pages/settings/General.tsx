import { AppShell } from "@/components/layout/AppSidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

const STORAGE_KEY = "settings.general";

type GeneralSettings = {
  literPrice: number;
  maxDistance: number;
  language: "en" | "ar" | "ur";
};

export default function GeneralSettingsPage() {
  const [form, setForm] = useState<GeneralSettings>({
    literPrice: 0.63,
    maxDistance: 500,
    language: "en",
  });
  const [saving, setSaving] = useState(false);
  const { t, setLang } = useI18n();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GeneralSettings>;
        if (
          typeof parsed.literPrice === "number" &&
          typeof parsed.maxDistance === "number"
        ) {
          setForm({
            literPrice: parsed.literPrice,
            maxDistance: parsed.maxDistance,
            language: (parsed.language as "en" | "ar" | "ur") || "en",
          });
        }
      }
    } catch {}
  }, []);

  const save = async () => {
    setSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    localStorage.setItem("i18n.lang", form.language);
    setLang(form.language);
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    toast({ title: "Saved", description: "General settings updated." });
  };

  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 text-sm text-muted-foreground">
          {t("generalSettings")}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="grid max-w-3xl gap-6 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("literPrice")}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={form.literPrice}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      literPrice: Number(e.target.value),
                    }))
                  }
                  placeholder="0.63"
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("maxDistance")}
                </div>
                <Input
                  type="number"
                  value={form.maxDistance}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxDistance: Number(e.target.value),
                    }))
                  }
                  placeholder="500"
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("language")}
                </div>
                <Select
                  value={form.language}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      language: v as "en" | "ar" | "ur",
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="ur">اردو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex justify-end pt-2">
                <Button onClick={save} disabled={saving} className="bg-sky-600 hover:bg-sky-500">
                  {saving ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
