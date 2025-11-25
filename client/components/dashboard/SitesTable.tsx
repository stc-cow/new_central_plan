import { useEffect, useState } from "react";
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
  siteName: 1,
  vendor: 2,
  region: 3,
  district: 4,
  city: 5,
  powerSource: 6,
  cowStatus: 9,
  latitude: 11,
  longitude: 12,
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
        setRows(limit ? mapped.slice(0, limit) : mapped);
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
          const latitude = (r[COLS.latitude] || "").trim();
          const longitude = (r[COLS.longitude] || "").trim();
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

        setRows(limit ? mapped.slice(0, limit) : mapped);

        // Push to Supabase (best-effort)
        const payload = mapped.map((m) => ({
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
      <CardContent className="pt-6">
        {loading && <div className="text-center py-4">{t("loading")}</div>}
        {error && <div className="text-center py-4 text-red-600">{error}</div>}
        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("siteName") || "Site Name"}</TableHead>
                <TableHead>{t("vendor") || "Vendor"}</TableHead>
                <TableHead>{t("region") || "Region"}</TableHead>
                <TableHead>{t("district") || "District"}</TableHead>
                <TableHead>{t("city") || "City"}</TableHead>
                <TableHead>{t("powerSource") || "Power Source"}</TableHead>
                <TableHead>{t("cowStatus") || "COW Status"}</TableHead>
                <TableHead>Coordinates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.siteName}</TableCell>
                  <TableCell>{row.vendor}</TableCell>
                  <TableCell>{row.region}</TableCell>
                  <TableCell>{row.district}</TableCell>
                  <TableCell>{row.city}</TableCell>
                  <TableCell>{row.powerSource}</TableCell>
                  <TableCell>{row.cowStatus}</TableCell>
                  <TableCell>
                    {row.latitude && row.longitude
                      ? `${row.latitude}, ${row.longitude}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
