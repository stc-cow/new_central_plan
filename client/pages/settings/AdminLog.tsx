import Header from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Log = { id: number; username: string; event: string; created_at: string };

export default function AdminLogPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_log")
        .select("id, username, event, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled && !error && data) setRows(data as any);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 text-sm text-muted-foreground">
          {t("settingsAdminLog")}
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]">
                  <TableHead className="text-white">{t("username")}</TableHead>
                  <TableHead className="text-white">{t("time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-sm text-muted-foreground"
                    >
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-sm text-muted-foreground"
                    >
                      {t("noDataYet")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.username}
                      </TableCell>
                      <TableCell>
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
