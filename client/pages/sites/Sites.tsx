import { AppShell } from "@/components/layout/AppSidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Columns2,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Dashboard-mapped row
type SiteRow = {
  id: number;
  name: string; // site_name
  generator: string; // site_name
  currentLiters: string; // empty
  dailyVirtual: string; // empty
  lastAvg: string; // empty
  rate: string; // empty
  driver: string; // empty
  project: string; // constant "stc COW"
  city: string; // mapped from district
  address: string; // mapped from city
  active: boolean; // ON-AIR / In Progress => check, OFF-AIR => X
  cowStatus: string; // keep status for editing
};

const allColumns = [
  { key: "index", label: "#" },
  { key: "name", label: "Name" },
  { key: "generator", label: "Generator" },
  { key: "currentLiters", label: "Current Liters in Tank" },
  { key: "dailyVirtual", label: "Daily virtual consumption" },
  { key: "rate", label: "Rate" },
  { key: "driver", label: "Driver" },
  { key: "project", label: "Project" },
  { key: "city", label: "City" },
  { key: "address", label: "Address" },
  { key: "active", label: "Active" },
  { key: "settings", label: "Settings" },
] as const;

type ColumnKey = (typeof allColumns)[number]["key"];

type EditForm = {
  id: number;
  site_name: string;
  district: string;
  city: string;
  cow_status: string;
};

export default function SitesPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [cols, setCols] = useState<Record<ColumnKey, boolean>>({
    index: true,
    name: true,
    generator: true,
    currentLiters: true,
    dailyVirtual: true,
    rate: true,
    driver: true,
    project: true,
    city: true,
    address: true,
    active: true,
    settings: true,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [viewing, setViewing] = useState<SiteRow | null>(null);

  const mapRow = (d: any): SiteRow => {
    const status = (d.cow_status || "").toString();
    const sNorm = status.trim().toLowerCase();
    const isActive = sNorm.includes("on-air") || sNorm.includes("in progress");
    return {
      id: Number(d.id),
      name: d.site_name || "",
      generator: d.site_name || "",
      currentLiters: "",
      dailyVirtual: "",
      lastAvg: "",
      rate: "",
      driver: "",
      project: "stc COW",
      city: d.district || "",
      address: d.city || "",
      active: isActive,
      cowStatus: status,
    };
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, site_name, district, city, cow_status")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error || !data) {
        setRows([]);
        return;
      }
      setRows(data.map(mapRow));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      [r.name, r.generator, r.driver, r.project, r.city, r.address].some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const exportCsv = () => {
    const visible = allColumns.filter(
      (c) =>
        cols[c.key] &&
        !["index", "settings", "active"].includes(c.key as string),
    );
    const head = visible.map((c) => c.label).join(",");
    const body = filtered
      .map((r) => visible.map((c) => (r as any)[c.key]).join(","))
      .join("\n");
    const blob = new Blob([head + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sites.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: number) => {
    const { error } = await supabase.from("sites").delete().eq("id", id);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  };

  const openEdit = (r: SiteRow) => {
    setEditing({
      id: r.id,
      site_name: r.name,
      district: r.city,
      city: r.address,
      cow_status: r.cowStatus,
    });
    setEditOpen(true);
  };
  const openView = (r: SiteRow) => {
    setViewing(r);
    setViewOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error, data } = await supabase
      .from("sites")
      .update({
        site_name: editing.site_name,
        district: editing.district,
        city: editing.city,
        cow_status: editing.cow_status,
      })
      .eq("id", editing.id)
      .select("id, site_name, district, city, cow_status")
      .single();
    if (!error && data) {
      setRows((r) => r.map((x) => (x.id === editing.id ? mapRow(data) : x)));
      setEditOpen(false);
      setEditing(null);
    }
  };

  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Manage the site details
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" className="hidden sm:inline-flex">
              Archive
            </Button>
            <Button
              variant="secondary"
              className="hidden sm:inline-flex"
              onClick={exportCsv}
            >
              <Download className="mr-2 h-4 w-4" /> Excel All
            </Button>
            <Button
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden sm:inline-flex">
                  <Columns2 className="mr-2 h-4 w-4" /> Column visibility
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allColumns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={cols[c.key]}
                    onCheckedChange={(v) =>
                      setCols((s) => ({ ...s, [c.key]: !!v }))
                    }
                    disabled={c.key === "index"}
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="text-sm text-muted-foreground">
                Print | Column visibility | Show {pageSize} rows
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Search</span>
                <Input
                  value={query}
                  onChange={(e) => {
                    setPage(1);
                    setQuery(e.target.value);
                  }}
                  placeholder=""
                  className="h-9 w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]">
                    {cols.index && (
                      <TableHead className="text-white">#</TableHead>
                    )}
                    {cols.name && (
                      <TableHead className="text-white">Name</TableHead>
                    )}
                    {cols.generator && (
                      <TableHead className="text-white">Generator</TableHead>
                    )}
                    {cols.currentLiters && (
                      <TableHead className="text-white">
                        Current Liters in Tank
                      </TableHead>
                    )}
                    {cols.dailyVirtual && (
                      <TableHead className="text-white">
                        Daily virtual consumption
                      </TableHead>
                    )}
                    {cols.rate && (
                      <TableHead className="text-white">Rate</TableHead>
                    )}
                    {cols.driver && (
                      <TableHead className="text-white">Driver</TableHead>
                    )}
                    {cols.project && (
                      <TableHead className="text-white">Project</TableHead>
                    )}
                    {cols.city && (
                      <TableHead className="text-white">City</TableHead>
                    )}
                    {cols.address && (
                      <TableHead className="text-white">Address</TableHead>
                    )}
                    {cols.active && (
                      <TableHead className="text-white">Active</TableHead>
                    )}
                    {cols.settings && (
                      <TableHead className="text-white">Settings</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.map((r, idx) => (
                    <TableRow key={r.id}>
                      {cols.index && (
                        <TableCell className="font-medium">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                      )}
                      {cols.name && (
                        <TableCell className="font-medium">{r.name}</TableCell>
                      )}
                      {cols.generator && <TableCell>{r.generator}</TableCell>}
                      {cols.currentLiters && (
                        <TableCell>{r.currentLiters}</TableCell>
                      )}
                      {cols.dailyVirtual && (
                        <TableCell>{r.dailyVirtual}</TableCell>
                      )}
                      {cols.rate && <TableCell>{r.rate}</TableCell>}
                      {cols.driver && <TableCell>{r.driver}</TableCell>}
                      {cols.project && <TableCell>{r.project}</TableCell>}
                      {cols.city && <TableCell>{r.city}</TableCell>}
                      {cols.address && <TableCell>{r.address}</TableCell>}
                      {cols.active && (
                        <TableCell>
                          {r.active ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-rose-500" />
                          )}
                        </TableCell>
                      )}
                      {cols.settings && (
                        <TableCell className="space-x-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="View"
                            onClick={() => openView(r)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Edit"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete"
                            onClick={() => remove(r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {current.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={allColumns.length}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No results
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
              <div>
                Showing {current.length} of {filtered.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span className="tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="site_name">Name (Site Name)</Label>
                <Input
                  id="site_name"
                  value={editing.site_name}
                  onChange={(e) =>
                    setEditing((s) =>
                      s ? { ...s, site_name: e.target.value } : s,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="district">City (District)</Label>
                <Input
                  id="district"
                  value={editing.district}
                  onChange={(e) =>
                    setEditing((s) =>
                      s ? { ...s, district: e.target.value } : s,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="city">Address (City)</Label>
                <Input
                  id="city"
                  value={editing.city}
                  onChange={(e) =>
                    setEditing((s) => (s ? { ...s, city: e.target.value } : s))
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editing.cow_status}
                  onValueChange={(v) =>
                    setEditing((s) => (s ? { ...s, cow_status: v } : s))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON-AIR">ON-AIR</SelectItem>
                    <SelectItem value="OFF-AIR">OFF-AIR</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Site Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>{" "}
                {viewing.name}
              </div>
              <div>
                <span className="text-muted-foreground">Generator:</span>{" "}
                {viewing.generator}
              </div>
              <div>
                <span className="text-muted-foreground">City (District):</span>{" "}
                {viewing.city}
              </div>
              <div>
                <span className="text-muted-foreground">Address (City):</span>{" "}
                {viewing.address}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                {viewing.cowStatus}
              </div>
              <div>
                <span className="text-muted-foreground">Project:</span>{" "}
                {viewing.project}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
