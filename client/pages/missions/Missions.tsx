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
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Columns2,
  Download,
  Filter,
  Plus,
  Printer,
  Pencil,
  Trash2,
  UploadCloud,
} from "lucide-react";

// Mission type
type Mission = {
  id: number;
  missionId: string;
  siteName: string;
  generator: string;
  project: string;
  driverName: string;
  createdDate: string; // ISO
  filledLiters: number; // Filled liters (quantity requested)
  virtualCalculated: number;
  actualInTank: number;
  quantityAddedLastTask: number;
  city: string;
  notes?: string;
  missionStatus:
    | "Creation"
    | "Finished by Driver"
    | "Task approved"
    | "Task returned to the driver"
    | "Reported by driver"
    | "Canceled";
  assignedDriver: string;
  createdBy: string;
};

const initialRows: Mission[] = [
  {
    id: 1,
    siteName: "C700 COW312",
    generator: "GEN-02",
    project: "stc-cow",
    driverName: "ZAFAR ABDUL SATTAR",
    createdDate: "2025-03-23",
    filledLiters: 0,
    virtualCalculated: 0,
    actualInTank: 12,
    quantityAddedLastTask: 12,
    city: "Dammam",
    notes: "",
    missionStatus: "Creation",
    assignedDriver: "ZAFAR ABDUL SATTAR",
    createdBy: "System",
  },
  {
    id: 2,
    siteName: "L6999 COW6048",
    generator: "GEN-01",
    project: "stc-cow",
    driverName: "Irfan",
    createdDate: "2025-03-23",
    filledLiters: 0,
    virtualCalculated: 0,
    actualInTank: 0,
    quantityAddedLastTask: 0,
    city: "Al-Ahsa",
    notes: "",
    missionStatus: "Creation",
    assignedDriver: "Irfan",
    createdBy: "System",
  },
  {
    id: 3,
    siteName: "L6699 COW6148",
    generator: "GEN-02",
    project: "stc-cow",
    driverName: "Muhammad Ansar",
    createdDate: "2025-03-23",
    filledLiters: 0,
    virtualCalculated: 0,
    actualInTank: 0,
    quantityAddedLastTask: 11,
    city: "Muzahimiyah",
    notes: "",
    missionStatus: "Creation",
    assignedDriver: "Muhammad Ansar",
    createdBy: "System",
  },
  {
    id: 4,
    siteName: "L6699 COW6149",
    generator: "GEN-03",
    project: "stc-cow",
    driverName: "Reaza",
    createdDate: "2025-03-23",
    filledLiters: 0,
    virtualCalculated: 0,
    actualInTank: 0,
    quantityAddedLastTask: 0,
    city: "Hafr Elbaten",
    notes: "",
    missionStatus: "Creation",
    assignedDriver: "Reaza",
    createdBy: "System",
  },
];

const STATUS_ORDER: Mission["missionStatus"][] = [
  "Creation",
  "Finished by Driver",
  "Task approved",
  "Task returned to the driver",
  "Reported by driver",
  "Canceled",
];

const statusColor: Record<Mission["missionStatus"], string> = {
  Creation: "bg-orange-500",
  "Finished by Driver": "bg-sky-500",
  "Task approved": "bg-emerald-500",
  "Task returned to the driver": "bg-indigo-500",
  "Reported by driver": "bg-rose-500",
  Canceled: "bg-gray-400",
};

const allColumns = [
  { key: "missionId", label: "Mission ID" },
  { key: "siteName", label: "Site Name" },
  { key: "generator", label: "Generator" },
  { key: "project", label: "Project" },
  { key: "driverName", label: "Driver Name" },
  { key: "createdDate", label: "Created Date" },
  { key: "filledLiters", label: "Filled liters" },
  { key: "virtualCalculated", label: "Virtual Calculated liters" },
  { key: "actualInTank", label: "Actual liters found in Tank" },
  { key: "quantityAddedLastTask", label: "Quantity added Last Task" },
  { key: "city", label: "City" },
  { key: "notes", label: "Notes" },
  { key: "missionStatus", label: "Mission status" },
  { key: "assignedDriver", label: "Driver" },
  { key: "createdBy", label: "Created By" },
  { key: "settings", label: "Settings" },
] as const;

type ColumnKey = (typeof allColumns)[number]["key"];

export default function MissionsPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Mission[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<
    "All" | Mission["missionStatus"]
  >("All");
  const [cols, setCols] = useState<Record<ColumnKey, boolean>>({
    siteName: true,
    generator: true,
    project: true,
    driverName: true,
    createdDate: true,
    filledLiters: true,
    virtualCalculated: true,
    actualInTank: true,
    quantityAddedLastTask: true,
    city: true,
    notes: true,
    missionStatus: true,
    assignedDriver: true,
    createdBy: true,
    settings: true,
  });

  type AddTaskForm = {
    siteName: string;
    driverId?: number | null;
    driverName: string;
    driverPhone: string;
    scheduledAt: string;
    requiredLiters?: number | null;
    notes?: string;
  };
  const emptyForm: AddTaskForm = {
    siteName: "",
    driverId: null,
    driverName: "",
    driverPhone: "",
    scheduledAt: "",
    requiredLiters: null,
    notes: "",
  };
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddTaskForm>(emptyForm);
  const [addErrors, setAddErrors] = useState<
    Partial<Record<keyof AddTaskForm, string>>
  >({});
  const [drivers, setDrivers] = useState<
    { id: number; name: string; phone: string | null }[]
  >([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [entryByTask, setEntryByTask] = useState<Record<number, any | null>>(
    {},
  );
  const [imagesByTask, setImagesByTask] = useState<Record<number, string[]>>(
    {},
  );
  const [imageOpen, setImageOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, name, phone, active")
        .order("name");
      if (!mounted) return;
      if (data)
        setDrivers(
          data.map((d: any) => ({
            id: Number(d.id),
            name: d.name || "",
            phone: d.phone || null,
          })),
        );
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function validate(form: AddTaskForm) {
    const errs: Partial<Record<keyof AddTaskForm, string>> = {};
    if (!form.siteName.trim()) errs.siteName = "required";
    if (!form.driverName.trim()) errs.driverName = "required";
    return errs;
  }

  const handleAdd = async () => {
    const errs = validate(addForm);
    setAddErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const scheduled_iso = addForm.scheduledAt
      ? new Date(addForm.scheduledAt).toISOString()
      : null;
    const payload = {
      site_id: null as number | null,
      site_name: addForm.siteName.trim(),
      driver_name: addForm.driverName.trim(),
      driver_phone: addForm.driverPhone || null,
      scheduled_at: scheduled_iso,
      status: "pending",
      admin_status: "Creation",
      required_liters: addForm.requiredLiters ?? null,
      notes: addForm.notes || null,
    };
    const { data, error } = await supabase
      .from("driver_tasks")
      .insert(payload)
      .select(
        "id, site_name, driver_name, scheduled_at, status, required_liters, notes, created_at",
      )
      .single();
    if (error || !data) {
      toast({
        title: "Create failed",
        description: error?.message || "Unknown error",
      });
      return;
    }
    const createdDate =
      (data.created_at as string)?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10);
    const newRow: Mission = {
      id: Number(data.id),
      siteName: (data.site_name as string) || "",
      generator: "",
      project: "",
      driverName: (data.driver_name as string) || "",
      createdDate,
      filledLiters: 0,
      virtualCalculated: 0,
      actualInTank: 0,
      quantityAddedLastTask: Number(data.required_liters || 0),
      city: "",
      notes: (data.notes as string) || "",
      missionStatus: "Creation",
      assignedDriver: (data.driver_name as string) || "",
      createdBy:
        localStorage.getItem("auth.username") ||
        localStorage.getItem("remember.username") ||
        "User",
    };
    setRows((r) => [newRow, ...r]);
    toast({ title: "Task created" });
    // send notification to the assigned driver
    try {
      const sentBy =
        localStorage.getItem("auth.username") ||
        localStorage.getItem("remember.username") ||
        "Admin";
      await supabase.from("driver_notifications").insert({
        title: "New mission assigned",
        message: `A new mission has been assigned to you for site: ${addForm.siteName}`,
        driver_name: addForm.driverName || null,
        sent_by: sentBy,
      });
    } catch {}
    setAddForm(emptyForm);
    setAddOpen(false);
  };

  const toggleExpand = async (r: Mission) => {
    setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }));
    if (!expanded[r.id]) {
      // load latest driver entry
      const { data } = await supabase
        .from("driver_task_entries")
        .select(
          "liters, rate, station, receipt_number, photo_url, odometer, submitted_by, submitted_at",
        )
        .eq("task_id", r.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setEntryByTask((m) => ({ ...m, [r.id]: data || null }));
      // try list storage pics
      try {
        const dir = `${(r.driverName || "driver").replace(/\s+/g, "_")}/${r.id}`;
        const { data: files } = await (supabase.storage as any)
          .from("driver-uploads")
          .list(dir, { limit: 20 });
        if (files && Array.isArray(files)) {
          const urls = files.map(
            (f: any) =>
              (supabase.storage as any)
                .from("driver-uploads")
                .getPublicUrl(`${dir}/${f.name}`).data.publicUrl,
          );
          setImagesByTask((m) => ({ ...m, [r.id]: urls }));
        }
      } catch {}
    }
  };

  const setAdminStatus = async (
    id: number,
    status: Mission["missionStatus"],
  ) => {
    const { error } = await supabase
      .from("driver_tasks")
      .update({ admin_status: status })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message });
      return;
    }
    if (status === "Task approved") {
      const t = rows.find((r) => r.id === id);
      if (t) {
        await supabase.from("approved_reports").upsert(
          {
            task_id: id,
            mission_id: t.missionId,
            site_name: t.siteName,
            driver_name: t.driverName,
            quantity_added: t.quantityAddedLastTask || t.filledLiters || null,
            notes: t.notes || null,
            status: "approved",
          },
          { onConflict: "task_id" },
        );
      }
    }
    setRows((arr) =>
      arr.map((r) => (r.id === id ? { ...r, missionStatus: status } : r)),
    );
    toast({ title: `Status: ${status}` });
  };

  const handleSyncAll = async () => {
    if (rows.length === 0) {
      toast({ title: "No missions to sync" });
      return;
    }
    const payload = rows.map((r) => ({
      site_id: null as number | null,
      site_name: r.siteName,
      driver_name: r.assignedDriver || r.driverName,
      driver_phone: null as string | null,
      scheduled_at: null as string | null,
      status: "pending",
      admin_status: r.missionStatus,
      required_liters: r.quantityAddedLastTask || r.filledLiters || null,
      notes: r.notes || null,
    }));
    const { error } = await supabase.from("driver_tasks").insert(payload);
    if (error) {
      toast({ title: "Sync failed", description: error.message });
      return;
    }
    try {
      const sentBy =
        localStorage.getItem("auth.username") ||
        localStorage.getItem("remember.username") ||
        "Admin";
      const notices = rows.map((r) => ({
        title: "New mission assigned",
        message: `A new mission has been assigned to you for site: ${r.siteName}`,
        driver_name: r.assignedDriver || r.driverName || null,
        sent_by: sentBy,
      }));
      if (notices.length > 0)
        await supabase.from("driver_notifications").insert(notices);
    } catch {}
    toast({ title: "Missions synced to Supabase" });
  };

  const loadFromDb = async () => {
    // Try using the supabase client first (handles auth/CORS). If that fails, fall back to direct REST to surface network/CORS errors.
    try {
      const { data, error } = await supabase
        .from("driver_tasks")
        .select(
          "id, mission_id, site_name, driver_name, scheduled_at, status, admin_status, required_liters, notes, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || !Array.isArray(data) || data.length === 0) {
        toast({
          title: "No missions found",
          description: "Try adding a mission or refreshing.",
        });
        setRows([]);
        return;
      }
      const mapStatus = (s?: string): Mission["missionStatus"] => {
        switch ((s || "").toLowerCase()) {
          case "completed":
            return "Finished by Driver";
          case "in_progress":
            return "Reported by driver";
          case "canceled":
            return "Canceled";
          default:
            return "Creation";
        }
      };
      const mapped: Mission[] = data.map((d: any) => ({
        id: Number(d.id),
        missionId: String(d.mission_id || ""),
        siteName: d.site_name || "",
        generator: "",
        project: "",
        driverName: d.driver_name || "",
        createdDate:
          (d.scheduled_at as string)?.slice(0, 10) ||
          (d.created_at as string)?.slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        filledLiters: 0,
        virtualCalculated: 0,
        actualInTank: 0,
        quantityAddedLastTask: Number(d.required_liters || 0),
        city: "",
        notes: d.notes || "",
        missionStatus: (d.admin_status as string) || mapStatus(d.status),
        assignedDriver: d.driver_name || "",
        createdBy: "System",
      }));
      setRows(mapped);
      return;
    } catch (clientErr) {
      console.error("Supabase client error", clientErr);
      // REST fallback to surface CORS/network issues
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/driver_tasks?select=id,mission_id,site_name,driver_name,status,admin_status,required_liters,notes,created_at`;
        const res = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
          },
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("REST fetch failed", res.status, text);
          toast({
            title: "Failed to load missions",
            description: `REST ${res.status}: ${text}`,
          });
          return;
        }
        const json = await res.json();
        if (!Array.isArray(json) || json.length === 0) {
          toast({
            title: "No missions found",
            description: "Try adding a mission or refreshing.",
          });
          setRows([]);
          return;
        }
        const mapped = json.map((d: any) => ({
          id: Number(d.id),
          missionId: String(d.mission_id || ""),
          siteName: d.site_name || "",
          generator: "",
          project: "",
          driverName: d.driver_name || "",
          createdDate: (d.created_at || new Date().toISOString()).slice(0, 10),
          filledLiters: 0,
          virtualCalculated: 0,
          actualInTank: 0,
          quantityAddedLastTask: Number(d.required_liters || 0),
          city: "",
          notes: d.notes || "",
          missionStatus: (d.admin_status as string) || "Creation",
          assignedDriver: d.driver_name || "",
          createdBy: "System",
        }));
        setRows(mapped);
        return;
      } catch (restErr) {
        console.error("REST fetch exception", restErr);
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "your app origin";
        toast({
          title: "Failed to load missions",
          description:
            "Network error (Failed to fetch). This commonly happens due to CORS or network restrictions. Add the app origin to Supabase Allowed Origins or ensure the project URL is reachable.",
        });
        console.info(
          `Action: add ${origin} to Supabase → Settings → API → Allowed origins (CORS)`,
        );
        return;
      }
    }
  };

  useEffect(() => {
    loadFromDb();
  }, []);

  const counts = useMemo(() => {
    const map: Record<Mission["missionStatus"], number> = {
      Creation: 0,
      "Finished by Driver": 0,
      "Task approved": 0,
      "Task returned to the driver": 0,
      "Reported by driver": 0,
      Canceled: 0,
    };
    rows.forEach((r) => map[r.missionStatus]++);
    return map;
  }, [rows]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "All") return rows;
    return rows.filter((r) => r.missionStatus === statusFilter);
  }, [rows, statusFilter]);

  const filtered = useMemo(() => {
    if (!query) return filteredByStatus;
    const q = query.toLowerCase();
    return filteredByStatus.filter((r) =>
      [
        r.siteName,
        r.generator,
        r.project,
        r.driverName,
        r.city,
        r.assignedDriver,
        r.createdBy,
        r.missionStatus,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [filteredByStatus, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const exportCsv = () => {
    const visible = allColumns.filter(
      (c) => cols[c.key] && c.key !== "settings",
    );
    const head = visible.map((c) => c.label).join(",");
    const body = filtered
      .map((r) =>
        visible
          .map((c) => (r as any)[c.key])
          .map((v) => (typeof v === "string" ? v.replaceAll(",", " ") : v))
          .join(","),
      )
      .join("\n");
    const blob = new Blob([head + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "missions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: number) => {
    await supabase.from("driver_tasks").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Manage all Missions for drivers (fresh - confirm - cancel)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="hidden sm:inline-flex"
              onClick={exportCsv}
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={handleSyncAll}
            >
              Sync to DB
            </Button>
            <Button
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={loadFromDb}
            >
              <UploadCloud className="mr-2 h-4 w-4" /> Refresh
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
                    disabled={c.key === "siteName"}
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-sky-600 hover:bg-sky-500">
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="m-site">Site name</Label>
                    <Input
                      id="m-site"
                      value={addForm.siteName}
                      onChange={(e) =>
                        setAddForm((s) => ({ ...s, siteName: e.target.value }))
                      }
                    />
                    {addErrors.siteName && (
                      <span className="text-sm text-red-500">required</span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Driver</Label>
                    <Select
                      value={addForm.driverId ? String(addForm.driverId) : ""}
                      onValueChange={(v) => {
                        const d = drivers.find((x) => String(x.id) === v);
                        setAddForm((s) => ({
                          ...s,
                          driverId: d ? d.id : null,
                          driverName: d ? d.name : "",
                          driverPhone: d?.phone || "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="m-phone">Driver phone</Label>
                    <Input
                      id="m-phone"
                      value={addForm.driverPhone}
                      onChange={(e) =>
                        setAddForm((s) => ({
                          ...s,
                          driverPhone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="m-when">Scheduled at</Label>
                    <Input
                      id="m-when"
                      type="datetime-local"
                      value={addForm.scheduledAt}
                      onChange={(e) =>
                        setAddForm((s) => ({
                          ...s,
                          scheduledAt: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="m-liters">Required liters</Label>
                    <Input
                      id="m-liters"
                      type="number"
                      value={addForm.requiredLiters ?? ""}
                      onChange={(e) =>
                        setAddForm((s) => ({
                          ...s,
                          requiredLiters:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="m-notes">Notes</Label>
                    <Textarea
                      id="m-notes"
                      value={addForm.notes}
                      onChange={(e) =>
                        setAddForm((s) => ({ ...s, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setStatusFilter("All")}
          >
            All{" "}
            <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-foreground">
              {rows.length}
            </span>
          </Badge>
          {STATUS_ORDER.map((s) => (
            <Badge
              key={s}
              className={`${statusColor[s]} cursor-pointer text-white hover:opacity-90`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
              <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs">
                {counts[s] || 0}
              </span>
            </Badge>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="ml-auto"
            aria-label="Filters"
          >
            <Filter className="h-4 w-4" />
          </Button>
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
                    {cols.missionId && (
                      <TableHead className="text-white">Mission ID</TableHead>
                    )}
                    {cols.siteName && (
                      <TableHead className="text-white">Site Name</TableHead>
                    )}
                    {cols.generator && (
                      <TableHead className="text-white">Generator</TableHead>
                    )}
                    {cols.project && (
                      <TableHead className="text-white">Project</TableHead>
                    )}
                    {cols.driverName && (
                      <TableHead className="text-white">Driver Name</TableHead>
                    )}
                    {cols.createdDate && (
                      <TableHead className="text-white">Created Date</TableHead>
                    )}
                    {cols.filledLiters && (
                      <TableHead className="text-white">
                        Filled liters
                      </TableHead>
                    )}
                    {cols.virtualCalculated && (
                      <TableHead className="text-white">
                        Virtual Calculated liters
                      </TableHead>
                    )}
                    {cols.actualInTank && (
                      <TableHead className="text-white">
                        Actual liters found in Tank
                      </TableHead>
                    )}
                    {cols.quantityAddedLastTask && (
                      <TableHead className="text-white">
                        Quantity added Last Task
                      </TableHead>
                    )}
                    {cols.city && (
                      <TableHead className="text-white">City</TableHead>
                    )}
                    {cols.notes && (
                      <TableHead className="text-white">Notes</TableHead>
                    )}
                    {cols.missionStatus && (
                      <TableHead className="text-white">
                        Mission status
                      </TableHead>
                    )}
                    {cols.assignedDriver && (
                      <TableHead className="text-white">Driver</TableHead>
                    )}
                    {cols.createdBy && (
                      <TableHead className="text-white">Created By</TableHead>
                    )}
                    {cols.settings && (
                      <TableHead className="text-white">Settings</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.map((r) => (
                    <TableRow
                      key={r.id}
                      onClick={() => toggleExpand(r)}
                      className="cursor-pointer"
                    >
                      {cols.missionId && (
                        <TableCell className="font-medium">
                          {r.missionId}
                        </TableCell>
                      )}
                      {cols.siteName && (
                        <TableCell className="font-medium">
                          {r.siteName}
                        </TableCell>
                      )}
                      {cols.generator && <TableCell>{r.generator}</TableCell>}
                      {cols.project && <TableCell>{r.project}</TableCell>}
                      {cols.driverName && <TableCell>{r.driverName}</TableCell>}
                      {cols.createdDate && (
                        <TableCell>{r.createdDate}</TableCell>
                      )}
                      {cols.filledLiters && (
                        <TableCell>{r.filledLiters}</TableCell>
                      )}
                      {cols.virtualCalculated && (
                        <TableCell>{r.virtualCalculated}</TableCell>
                      )}
                      {cols.actualInTank && (
                        <TableCell>{r.actualInTank}</TableCell>
                      )}
                      {cols.quantityAddedLastTask && (
                        <TableCell>{r.quantityAddedLastTask}</TableCell>
                      )}
                      {cols.city && <TableCell>{r.city}</TableCell>}
                      {cols.notes && <TableCell>{r.notes || ""}</TableCell>}
                      {cols.missionStatus && (
                        <TableCell>
                          <span
                            className={`rounded px-2 py-0.5 text-xs text-white ${statusColor[r.missionStatus]}`}
                          >
                            {r.missionStatus}
                          </span>
                        </TableCell>
                      )}
                      {cols.assignedDriver && (
                        <TableCell>{r.assignedDriver}</TableCell>
                      )}
                      {cols.createdBy && <TableCell>{r.createdBy}</TableCell>}
                      {cols.settings && (
                        <TableCell className="space-x-2 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <img
                              src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2F6104b03ad0e647e89d8eb60c6aa2ad70?format=webp&width=256"
                              alt="expand"
                              className="h-5 w-5 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(r);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminStatus(
                                  r.id,
                                  "Task returned to the driver",
                                );
                              }}
                            >
                              Back to driver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminStatus(r.id, "Canceled");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))
                              }
                            >
                              {expanded[r.id] ? "Hide" : "Edit / Approve"}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(r.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {current.map((r) =>
                    expanded[r.id] ? (
                      <TableRow key={`exp-${r.id}`} className="bg-muted/30">
                        <TableCell colSpan={allColumns.length}>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Mission ID
                              </div>
                              <div className="font-medium">{r.missionId}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Site Name
                              </div>
                              <div className="font-medium">{r.siteName}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Driver Name
                              </div>
                              <div className="font-medium">{r.driverName}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Required Liters
                              </div>
                              <div className="font-medium">
                                {r.quantityAddedLastTask}
                              </div>
                            </div>
                            <div className="md:col-span-3">
                              <div className="text-xs text-muted-foreground">
                                Driver Entry
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  Liters: {entryByTask[r.id]?.liters ?? "-"}
                                </div>
                                <div>
                                  Rate: {entryByTask[r.id]?.rate ?? "-"}
                                </div>
                                <div>
                                  Station: {entryByTask[r.id]?.station ?? "-"}
                                </div>
                                <div>
                                  Receipt #:{" "}
                                  {entryByTask[r.id]?.receipt_number ?? "-"}
                                </div>
                                <div>
                                  Odometer: {entryByTask[r.id]?.odometer ?? "-"}
                                </div>
                                <div>
                                  Submitted By:{" "}
                                  {entryByTask[r.id]?.submitted_by ?? "-"}
                                </div>
                                <div className="col-span-2">
                                  Submitted At:{" "}
                                  {entryByTask[r.id]?.submitted_at ?? "-"}
                                </div>
                              </div>
                            </div>
                            <div className="md:col-span-3">
                              <div className="text-xs text-muted-foreground mb-1">
                                Images
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {entryByTask[r.id]?.photo_url && (
                                  <img
                                    src={entryByTask[r.id]?.photo_url}
                                    alt="photo"
                                    className="h-24 w-24 rounded object-cover cursor-zoom-in"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setImageSrc(
                                        entryByTask[r.id]?.photo_url as string,
                                      );
                                      setImageOpen(true);
                                    }}
                                  />
                                )}
                                {(imagesByTask[r.id] || []).map((u, i) => (
                                  <img
                                    key={i}
                                    src={u}
                                    alt={`upload-${i + 1}`}
                                    className="h-24 w-24 rounded object-cover cursor-zoom-in"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setImageSrc(u);
                                      setImageOpen(true);
                                    }}
                                  />
                                ))}
                                {!entryByTask[r.id]?.photo_url &&
                                  (!imagesByTask[r.id] ||
                                    imagesByTask[r.id].length === 0) && (
                                    <div className="text-sm text-muted-foreground">
                                      No images
                                    </div>
                                  )}
                              </div>
                            </div>
                            <div className="md:col-span-3 flex items-center justify-end gap-2">
                              <Button
                                className="bg-emerald-600 hover:bg-emerald-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAdminStatus(r.id, "Task approved");
                                }}
                              >
                                Approve
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null,
                  )}
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
      <Dialog
        open={imageOpen}
        onOpenChange={(o) => {
          setImageOpen(o);
          if (!o) setImageSrc(null);
        }}
      >
        <DialogContent className="sm:max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>Image preview</DialogTitle>
          </DialogHeader>
          {imageSrc && (
            <div className="max-h-[80vh] w-full">
              <img
                src={imageSrc}
                alt="preview"
                className="mx-auto max-h-[75vh] w-auto rounded object-contain"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
