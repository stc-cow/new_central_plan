import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPublishedSheetRows } from "@/lib/sheets";
import { supabase } from "@/lib/supabase";

export type SiteRow = {
  siteName: string;
  vendor: string;
  region: string;
  district: string;
  city: string;
  cowStatus: string;
  latitude: string;
  longitude: string;
  powerSource: string;
};

const COLS = {
  siteName: 1, // B
  vendor: 2, // C
  region: 3, // D
  district: 4, // E
  city: 5, // F
  powerSource: 6, // G
  cowStatus: 9, // J
  latitude: 11, // L
  longitude: 12, // M
} as const;

export function SitesTable({
  sourceUrl,
  limit,
}: {
  sourceUrl: string;
  limit?: number;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      // Try Supabase first
      const { data, error } = await supabase
        .from("sites")
        .select(
          "site_name, vendor, region, district, city, cow_status, latitude, longitude, power_source",
        )
        .not("region", "ilike", "%west%")
        .order("created_at", { ascending: false });
      if (!cancelled && !error && data && data.length > 0) {
        const mapped: SiteRow[] = data.map((d: any) => ({
          siteName: d.site_name ?? "",
          vendor: d.vendor ?? "",
          region: d.region ?? "",
          district: d.district ?? "",
          city: d.city ?? "",
          cowStatus: d.cow_status ?? "",
          latitude: d.latitude != null ? String(d.latitude) : "",
          longitude: d.longitude != null ? String(d.longitude) : "",
          powerSource: d.power_source ?? "",
        }));
        const filteredDb = mapped.filter(
          (m) => !(m.region || "").toLowerCase().includes("west"),
        );
        setRows(limit ? filteredDb.slice(0, limit) : filteredDb);
        setLoading(false);
        return;
      }
      // Fallback: fetch from Google Sheet, then push to Supabase
      try {
        const csv = await fetchPublishedSheetRows(sourceUrl);
        const mapped: SiteRow[] = [];
        for (let i = 1; i < csv.length; i++) {
          const r = csv[i];
          if (!r || r.length === 0) continue;
          const siteName = (r[COLS.siteName] || "").trim();
          const vendor = (r[COLS.vendor] || "").trim();
          const region = (r[COLS.region] || "").trim();
          const district = (r[COLS.district] || "").trim();
          const city = (r[COLS.city] || "").trim();
          const cowStatus = (r[COLS.cowStatus] || "").trim();
          const latStr = (r[COLS.latitude] || "").trim();
          const lonStr = (r[COLS.longitude] || "").trim();
          const latitude = latStr;
          const longitude = lonStr;
          const powerSource = (r[COLS.powerSource] || "").trim();
          if (!siteName && !vendor && !region && !district && !city) continue;
          mapped.push({
            siteName,
            vendor,
            region,
            district,
            city,
            cowStatus,
            latitude,
            longitude,
            powerSource,
          });
        }
        const filtered = mapped.filter(
          (m) => !(m.region || "").toLowerCase().includes("west"),
        );
        setRows(limit ? filtered.slice(0, limit) : filtered);
        // Push to Supabase (best-effort)
        const payload = filtered.map((m) => ({
          site_name: m.siteName,
          vendor: m.vendor,
          region: m.region,
          district: m.district,
          city: m.city,
          cow_status: m.cowStatus,
          latitude: m.latitude ? parseFloat(m.latitude) : null,
          longitude: m.longitude ? parseFloat(m.longitude) : null,
          power_source: m.powerSource,
        }));
        await supabase.from("sites").insert(payload);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceUrl, limit]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 pt-6 text-base font-medium">
          {t("sitesOverview")}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]">
              <TableHead className="text-white">{t("siteName")}</TableHead>
              <TableHead className="text-white">{t("vendor")}</TableHead>
              <TableHead className="text-white">{t("region")}</TableHead>
              <TableHead className="text-white">{t("district")}</TableHead>
              <TableHead className="text-white">{t("city")}</TableHead>
              <TableHead className="text-white">{t("cowStatus")}</TableHead>
              <TableHead className="text-white">{t("latitude")}</TableHead>
              <TableHead className="text-white">{t("longitude")}</TableHead>
              <TableHead className="text-white">{t("powerSource")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-sm text-muted-foreground"
                >
                  {t("loading")}
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-sm text-destructive"
                >
                  {t("failedToLoad")}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-sm text-muted-foreground"
                >
                  {t("noDataYet")}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              rows.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{r.siteName}</TableCell>
                  <TableCell>{r.vendor}</TableCell>
                  <TableCell>{r.region}</TableCell>
                  <TableCell>{r.district}</TableCell>
                  <TableCell>{r.city}</TableCell>
                  <TableCell>{r.cowStatus}</TableCell>
                  <TableCell>{r.latitude}</TableCell>
                  <TableCell>{r.longitude}</TableCell>
                  <TableCell>{r.powerSource}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
