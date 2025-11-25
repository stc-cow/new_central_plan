import { AppShell } from "@/components/layout/AppSidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
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

async function sha256(text: string) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
import {
  Columns2,
  Download,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Driver = {
  id: number;
  name: string;
  phone: string;
  zone: string;
  active: boolean;
};

const initialRows: Driver[] = [
  {
    id: 1,
    name: "Gul Muhammad",
    phone: "500861573",
    zone: "Mobily East Region",
    active: true,
  },
  {
    id: 2,
    name: "Irfan",
    phone: "566041714",
    zone: "COW East Region",
    active: true,
  },
  {
    id: 3,
    name: "Pradeep Singh",
    phone: "",
    zone: "Mobily East Region",
    active: false,
  },
  { id: 4, name: "MURALI.MUSAFMY", phone: "570235067", zone: "", active: true },
  {
    id: 5,
    name: "ZAFAR ABDUL SATTAR",
    phone: "500832560",
    zone: "COW East Region",
    active: true,
  },
  { id: 6, name: "Reaza", phone: "547621843", zone: "", active: true },
  {
    id: 7,
    name: "AWAHE",
    phone: "530408743",
    zone: "COW East Region",
    active: false,
  },
  { id: 8, name: "Tayyab", phone: "507687421", zone: "", active: true },
  {
    id: 9,
    name: "Anwar",
    phone: "591445707",
    zone: "COW Central Region",
    active: true,
  },
  {
    id: 10,
    name: "Kamran A Noor Akbar Khan",
    phone: "582115996",
    zone: "COW Central Region",
    active: true,
  },
];

const allColumns = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "zone", label: "Zone" },
  { key: "active", label: "Active" },
  { key: "settings", label: "Settings" },
] as const;

type ColumnKey = (typeof allColumns)[number]["key"];

export default function DriversPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Driver[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cols, setCols] = useState<Record<ColumnKey, boolean>>({
    name: true,
    phone: true,
    zone: true,
    active: true,
    settings: true,
  });
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");

  type DriverForm = {
    name: string;
    phone: string;
    zone: string;
    active: boolean;
  };
  const emptyForm: DriverForm = { name: "", phone: "", zone: "", active: true };
  const [addOpen, setAddOpen] = useState(false);
  const [addPassword, setAddPassword] = useState("");
  const [addForm, setAddForm] = useState<DriverForm>(emptyForm);
  const [addErrors, setAddErrors] = useState<
    Partial<Record<keyof DriverForm, string>>
  >({});

  function validate(form: DriverForm) {
    const errs: Partial<Record<keyof DriverForm, string>> = {};
    if (!form.name.trim()) errs.name = "required";
    return errs;
  }

  const handleAdd = async () => {
    const errs = validate(addForm);
    setAddErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const insertBody: any = {
      name: addForm.name,
      phone: addForm.phone || null,
      zone: addForm.zone || null,
      active: addForm.active,
    };
    if (addPassword) insertBody.password_sha256 = await sha256(addPassword);
    let data, error;
    ({ data, error } = await supabase
      .from("drivers")
      .insert(insertBody)
      .select("id, name, phone, zone, active")
      .single());
    if (error && addPassword && /password_sha256/.test(error.message)) {
      ({ data, error } = await supabase
        .from("drivers")
        .insert({
          name: insertBody.name,
          phone: insertBody.phone,
          zone: insertBody.zone,
          active: insertBody.active,
        })
        .select("id, name, phone, zone, active")
        .single());
      if (!error) {
        toast({
          title: "Saved without password",
          description:
            "Create a 'password_sha256' column in Supabase to enable password login.",
        });
      }
    }
    if (error || !data) {
      toast({
        title: "Create failed",
        description: error?.message || "Unknown error",
      });
      return;
    }
    setRows((r) => [
      {
        id: Number(data.id),
        name: (data.name as string) || "",
        phone: (data.phone as string) || "",
        zone: (data.zone as string) || "",
        active: Boolean(data.active),
      },
      ...r,
    ]);
    toast({ title: "Driver created" });
    setAddForm(emptyForm);
    setAddPassword("");
    setAddOpen(false);
  };

  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Driver | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Driver | null>(null);
  const [editPassword, setEditPassword] = useState("");

  const openView = (row: Driver) => {
    setViewing(row);
    setViewOpen(true);
  };
  const openEdit = (row: Driver) => {
    setEditForm({ ...row });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    const errs = validate({
      name: editForm.name,
      phone: editForm.phone,
      zone: editForm.zone,
      active: editForm.active,
    });
    if (Object.keys(errs).length > 0) return;
    const updateBody: any = {
      name: editForm.name,
      phone: editForm.phone || null,
      zone: editForm.zone || null,
      active: editForm.active,
    };
    if (editPassword) updateBody.password_sha256 = await sha256(editPassword);
    let error;
    ({ error } = await supabase
      .from("drivers")
      .update(updateBody)
      .eq("id", editForm.id));
    if (error && editPassword && /password_sha256/.test(error.message)) {
      ({ error } = await supabase
        .from("drivers")
        .update({
          name: updateBody.name,
          phone: updateBody.phone,
          zone: updateBody.zone,
          active: updateBody.active,
        })
        .eq("id", editForm.id));
      if (!error) {
        toast({
          title: "Updated without password",
          description:
            "Add 'password_sha256' column in Supabase to store passwords.",
        });
      }
    }
    if (error) {
      toast({ title: "Update failed", description: error.message });
      return;
    }
    setRows((r) =>
      r.map((x) => (x.id === editForm.id ? { ...x, ...editForm } : x)),
    );
    toast({ title: "Driver updated" });
    setEditOpen(false);
    setEditForm(null);
    setEditPassword("");
  };

  const filteredBase = useMemo(() => {
    let arr = rows;
    if (filterActive !== "all")
      arr = arr.filter((r) =>
        filterActive === "active" ? r.active : !r.active,
      );
    if (!query) return arr;
    const q = query.toLowerCase();
    return arr.filter((r) =>
      [r.name, r.phone, r.zone].some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    );
  }, [rows, query, filterActive]);

  const totalPages = Math.max(1, Math.ceil(filteredBase.length / pageSize));
  const current = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBase.slice(start, start + pageSize);
  }, [filteredBase, page, pageSize]);

  const exportCsv = () => {
    const visible = allColumns.filter(
      (c) => cols[c.key] && c.key !== "settings",
    );
    const head = visible.map((c) => c.label).join(",");
    const body = filteredBase
      .map((r) =>
        visible
          .map((c) =>
            c.key === "active" ? (r.active ? "Yes" : "No") : (r as any)[c.key],
          )
          .join(","),
      )
      .join("\n");
    const blob = new Blob([head + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drivers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: number) => {
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, name, phone, zone, active")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error && data) {
        setRows(
          data.map((d: any) => ({
            id: Number(d.id),
            name: d.name || "",
            phone: d.phone || "",
            zone: d.zone || "",
            active: Boolean(d.active),
          })),
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Manage the drivers and their users
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
              <Download className="mr-2 h-4 w-4" /> Export
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
                  <DialogTitle>Add Driver</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="d-name">Name</Label>
                    <Input
                      id="d-name"
                      value={addForm.name}
                      onChange={(e) =>
                        setAddForm((s) => ({ ...s, name: e.target.value }))
                      }
                    />
                    {addErrors.name && (
                      <span className="text-sm text-red-500">required</span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="d-phone">Phone</Label>
                    <Input
                      id="d-phone"
                      value={addForm.phone}
                      onChange={(e) =>
                        setAddForm((s) => ({ ...s, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="d-zone">Zone</Label>
                    <Input
                      id="d-zone"
                      value={addForm.zone}
                      onChange={(e) =>
                        setAddForm((s) => ({ ...s, zone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="d-pass">Password (optional)</Label>
                    <Input
                      id="d-pass"
                      type="password"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="d-active">Active</Label>
                    <Switch
                      id="d-active"
                      checked={addForm.active}
                      onCheckedChange={(v) =>
                        setAddForm((s) => ({ ...s, active: !!v }))
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

        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Driver details</DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="grid gap-3">
                <div>
                  <span className="text-sm text-muted-foreground">Name</span>
                  <div>{viewing.name}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <div>{viewing.phone}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Zone</span>
                  <div>{viewing.zone}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active</span>
                  {viewing.active ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Driver</DialogTitle>
            </DialogHeader>
            {editForm && (
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="e-name">Name</Label>
                  <Input
                    id="e-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((s) =>
                        s ? { ...s, name: e.target.value } : s,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e-phone">Phone</Label>
                  <Input
                    id="e-phone"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((s) =>
                        s ? { ...s, phone: e.target.value } : s,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e-zone">Zone</Label>
                  <Input
                    id="e-zone"
                    value={editForm.zone}
                    onChange={(e) =>
                      setEditForm((s) =>
                        s ? { ...s, zone: e.target.value } : s,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e-pass">
                    New Password (leave blank to keep)
                  </Label>
                  <Input
                    id="e-pass"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="e-active">Active</Label>
                  <Switch
                    id="e-active"
                    checked={editForm.active}
                    onCheckedChange={(v) =>
                      setEditForm((s) => (s ? { ...s, active: !!v } : s))
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center gap-2 p-4">
              <div className="flex gap-2">
                <Badge
                  variant={filterActive === "all" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setFilterActive("all")}
                >
                  All
                </Badge>
                <Badge
                  variant={filterActive === "active" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setFilterActive("active")}
                >
                  Active
                </Badge>
                <Badge
                  variant={
                    filterActive === "inactive" ? "default" : "secondary"
                  }
                  className="cursor-pointer"
                  onClick={() => setFilterActive("inactive")}
                >
                  Inactive
                </Badge>
              </div>
              <div className="ml-auto flex items-center gap-2">
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
                    {cols.name && (
                      <TableHead className="text-white">Name</TableHead>
                    )}
                    {cols.phone && (
                      <TableHead className="text-white">Phone</TableHead>
                    )}
                    {cols.zone && (
                      <TableHead className="text-white">Zone</TableHead>
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
                  {current.map((r) => (
                    <TableRow key={r.id}>
                      {cols.name && (
                        <TableCell className="font-medium">{r.name}</TableCell>
                      )}
                      {cols.phone && <TableCell>{r.phone}</TableCell>}
                      {cols.zone && <TableCell>{r.zone}</TableCell>}
                      {cols.active && (
                        <TableCell>
                          {r.active ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
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
                Showing {current.length} of {filteredBase.length} entries
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
    </AppShell>
  );
}
