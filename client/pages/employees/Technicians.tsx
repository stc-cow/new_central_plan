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
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
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

type Technician = {
  id: number;
  name: string;
  phone: string;
  active: boolean;
};

const initialRows: Technician[] = [
  { id: 1, name: "test", phone: "513007562", active: true },
];

const allColumns = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "active", label: "Active" },
  { key: "settings", label: "Settings" },
] as const;

type ColumnKey = (typeof allColumns)[number]["key"];

export default function TechniciansPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Technician[]>(initialRows);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cols, setCols] = useState<Record<ColumnKey, boolean>>({
    name: true,
    phone: true,
    active: true,
    settings: true,
  });

  type TechnicianForm = {
    name: string;
    phone: string;
    active: boolean;
  };
  const emptyForm: TechnicianForm = { name: "", phone: "", active: true };
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<TechnicianForm>(emptyForm);
  const [addErrors, setAddErrors] = useState<
    Partial<Record<keyof TechnicianForm, string>>
  >({});

  function validate(form: TechnicianForm) {
    const errs: Partial<Record<keyof TechnicianForm, string>> = {};
    if (!form.name.trim()) errs.name = "required";
    return errs;
  }

  const handleAdd = async () => {
    const errs = validate(addForm);
    setAddErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const { data, error } = await supabase
      .from("technicians")
      .insert({
        name: addForm.name,
        phone: addForm.phone || null,
        active: addForm.active,
      })
      .select("id, name, phone, active")
      .single();
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
        active: Boolean(data.active),
      },
      ...r,
    ]);
    toast({ title: "Technician created" });
    setAddForm(emptyForm);
    setAddOpen(false);
  };

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      [r.name, r.phone].some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);

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
    a.download = "technicians.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: number) => {
    const { error } = await supabase.from("technicians").delete().eq("id", id);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  };

  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Technician | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Technician | null>(null);

  const openView = (row: Technician) => {
    setViewing(row);
    setViewOpen(true);
  };
  const openEdit = (row: Technician) => {
    setEditForm({ ...row });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    const errs = validate({
      name: editForm.name,
      phone: editForm.phone,
      active: editForm.active,
    });
    if (Object.keys(errs).length > 0) return;
    const { error } = await supabase
      .from("technicians")
      .update({
        name: editForm.name,
        phone: editForm.phone || null,
        active: editForm.active,
      })
      .eq("id", editForm.id);
    if (error) {
      toast({ title: "Update failed", description: error.message });
      return;
    }
    setRows((r) =>
      r.map((x) => (x.id === editForm.id ? { ...x, ...editForm } : x)),
    );
    toast({ title: "Technician updated" });
    setEditOpen(false);
    setEditForm(null);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("id, name, phone, active")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error && data) {
        setRows(
          data.map((d: any) => ({
            id: Number(d.id),
            name: d.name || "",
            phone: d.phone || "",
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
            Manage the technicians and their users
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
                  <DialogTitle>Add Technician</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="t-name">Name</Label>
                    <Input
                      id="t-name"
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
                    <Label htmlFor="t-phone">Phone</Label>
                    <Input
                      id="t-phone"
                      value={addForm.phone}
                      onChange={(e) =>
                        setAddForm((s) => ({ ...s, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="t-active">Active</Label>
                    <Switch
                      id="t-active"
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
              <DialogTitle>Technician details</DialogTitle>
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
              <DialogTitle>Edit Technician</DialogTitle>
            </DialogHeader>
            {editForm && (
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="te-name">Name</Label>
                  <Input
                    id="te-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((s) =>
                        s ? { ...s, name: e.target.value } : s,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="te-phone">Phone</Label>
                  <Input
                    id="te-phone"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((s) =>
                        s ? { ...s, phone: e.target.value } : s,
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="te-active">Active</Label>
                  <Switch
                    id="te-active"
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
                    {cols.name && (
                      <TableHead className="text-white">Name</TableHead>
                    )}
                    {cols.phone && (
                      <TableHead className="text-white">Phone</TableHead>
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
    </AppShell>
  );
}
