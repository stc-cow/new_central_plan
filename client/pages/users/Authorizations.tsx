import { AppShell } from "@/components/layout/AppSidebar";
import Header from "@/components/layout/Header";
import { useI18n } from "@/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Plus, Download, Columns2, Pencil, Trash2, Eye, UploadCloud } from "lucide-react";

type AuthUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  position: "Admin" | "User" | string;
};

const STORAGE_KEY = "app.authorizations";

const allColumns = [
  { key: "name", label: "Name" },
  { key: "username", label: "Username" },
  { key: "email", label: "Email" },
  { key: "position", label: "Position" },
  { key: "settings", label: "Settings", sticky: true },
] as const;

type ColumnKey = (typeof allColumns)[number]["key"];

type AuthForm = {
  name: string;
  username: string;
  email: string;
  position: "Admin" | "User" | string;
};

const emptyForm: AuthForm = {
  name: "",
  username: "",
  email: "",
  position: "User",
};

export default function AuthorizationsPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [cols, setCols] = useState<Record<ColumnKey, boolean>>({
    name: true,
    username: true,
    email: true,
    position: true,
    settings: true,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<AuthUser[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AuthForm>(emptyForm);
  const [addErrors, setAddErrors] = useState<Partial<Record<keyof AuthForm, string>>>({});

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<(AuthUser & { index: number }) | null>(null);

  function validate(form: AuthForm) {
    const errs: Partial<Record<keyof AuthForm, string>> = {};
    if (!form.name.trim()) errs.name = "required";
    if (!form.username.trim()) errs.username = "required";
    if (!form.email.trim()) errs.email = "required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "invalidEmail";
    if (!form.position) errs.position = "required";
    return errs;
  }

  async function syncAuth() {
    try {
      if (rows.length === 0) {
        toast({ title: t("noResults") });
        return;
      }
      const payload = rows.map((r) => ({
        name: r.name,
        username: r.username,
        email: r.email,
        position: r.position,
      }));
      const { error } = await supabase
        .from("authorizations")
        .upsert(payload, { onConflict: "username" });
      if (error) {
        toast({ title: "Sync failed", description: error.message });
        return;
      }
      const { data } = await supabase
        .from("authorizations")
        .select("id, name, username, email, position")
        .order("id", { ascending: false });
      if (data) {
        setRows(
          data.map((d: any) => ({
            id: d.id,
            name: d.name,
            username: d.username,
            email: d.email,
            position: d.position,
          }))
        );
      }
      toast({ title: "Synced to Supabase" });
    } catch (e: any) {
      toast({ title: "Sync failed", description: String(e?.message || e) });
    }
  }

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => [r.name, r.username, r.email, r.position].some((v) => String(v).toLowerCase().includes(q)));
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const exportCsv = () => {
    const visible = allColumns.filter((c) => cols[c.key] && !["settings"].includes(c.key));
    const head = visible.map((c) => c.label).join(",");
    const body = filtered.map((r) => visible.map((c) => (r as any)[c.key]).join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "authorizations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAdd = async () => {
    const errs = validate(addForm);
    setAddErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const { data, error } = await supabase
      .from("authorizations")
      .insert({
        name: addForm.name,
        username: addForm.username,
        email: addForm.email,
        position: addForm.position,
      })
      .select("id, name, username, email, position")
      .single();
    if (!error && data) {
      setRows((r) => [
        {
          id: data.id as number,
          name: data.name,
          username: data.username,
          email: data.email,
          position: data.position as any,
        },
        ...r,
      ]);
      toast({ title: t("save") });
      setAddForm(emptyForm);
      setAddOpen(false);
      return;
    }
    const nextId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const localRow: AuthUser = { id: nextId, ...addForm } as any;
    setRows((r) => [localRow, ...r]);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as AuthUser[]) : [];
      arr.unshift(localRow);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {}
    toast({ title: "Saved locally (Supabase unavailable)" });
    setAddForm(emptyForm);
    setAddOpen(false);
  };

  const openEdit = (row: AuthUser, index: number) => {
    setEditForm({ ...row, index });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    const errs = validate({
      name: editForm.name,
      username: editForm.username,
      email: editForm.email,
      position: editForm.position,
    });
    if (Object.keys(errs).length > 0) return;
    const { error } = await supabase
      .from("authorizations")
      .update({
        name: editForm.name,
        username: editForm.username,
        email: editForm.email,
        position: editForm.position,
      })
      .eq("id", editForm.id);
    if (!error) {
      setRows((r) => {
        const copy = r.slice();
        copy[editForm.index] = {
          id: editForm.id,
          name: editForm.name,
          username: editForm.username,
          email: editForm.email,
          position: editForm.position,
        };
        return copy;
      });
      setEditOpen(false);
      setEditForm(null);
    }
  };

  const remove = async (id: number) => {
    const { error } = await supabase.from("authorizations").delete().eq("id", id);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("authorizations")
        .select("id, name, username, email, position")
        .order("id", { ascending: false });
      if (!error && data) {
        if (data.length === 0) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const arr = JSON.parse(raw) as AuthUser[];
              if (Array.isArray(arr) && arr.length > 0) {
                const payload = arr.map((a) => ({
                  name: a.name,
                  username: a.username,
                  email: a.email,
                  position: a.position,
                }));
                const { data: inserted, error: insErr } = await supabase
                  .from("authorizations")
                  .insert(payload)
                  .select("id, name, username, email, position");
                if (!insErr && inserted) {
                  setRows(
                    inserted.map((d) => ({
                      id: d.id as number,
                      name: d.name as string,
                      username: d.username as string,
                      email: d.email as string,
                      position: d.position as any,
                    }))
                  );
                  return;
                }
              }
            }
          } catch {}
        }
        setRows(
          data.map((d) => ({
            id: d.id as number,
            name: d.name as string,
            username: d.username as string,
            email: d.email as string,
            position: d.position as any,
          }))
        );
      }
    })();
  }, []);

  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{t("authorizations")}</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="hidden sm:inline-flex" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> {t("export")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden sm:inline-flex">
                  <Columns2 className="mr-2 h-4 w-4" /> {t("columns")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allColumns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={cols[c.key]}
                    onCheckedChange={(v) => setCols((s) => ({ ...s, [c.key]: !!v }))}
                    disabled={c.key === "settings"}
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={syncAuth}>
              <UploadCloud className="mr-2 h-4 w-4" /> {t("sync")}
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-sky-600 hover:bg-sky-500">
                  <Plus className="mr-2 h-4 w-4" /> {t("add")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("addUser")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t("name")}</Label>
                    <Input id="name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
                    {addErrors.name && <p className="mt-1 text-xs text-destructive">{t(addErrors.name)}</p>}
                  </div>
                  <div>
                    <Label htmlFor="username">{t("username")}</Label>
                    <Input id="username" value={addForm.username} onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))} />
                    {addErrors.username && <p className="mt-1 text-xs text-destructive">{t(addErrors.username)}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input id="email" type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
                    {addErrors.email && <p className="mt-1 text-xs text-destructive">{t(addErrors.email)}</p>}
                  </div>
                  <div>
                    <Label>{t("position")}</Label>
                    <Select value={addForm.position} onValueChange={(v) => setAddForm((f) => ({ ...f, position: v }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("position")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">{t("admin")}</SelectItem>
                        <SelectItem value="User">{t("user")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {addErrors.position && <p className="mt-1 text-xs text-destructive">{t(addErrors.position)}</p>}
                  </div>
                </div>
                <DialogFooter className="mt-6 gap-2 sm:gap-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button onClick={handleAdd}>{t("save")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="text-sm text-muted-foreground">{t("excelPrintColumnVisibility")}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("search")}</span>
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
                    {cols.name && <TableHead className="text-white">{t("name")}</TableHead>}
                    {cols.username && <TableHead className="text-white">{t("username")}</TableHead>}
                    {cols.email && <TableHead className="text-white">{t("email")}</TableHead>}
                    {cols.position && <TableHead className="text-white">{t("position")}</TableHead>}
                    {cols.settings && <TableHead className="text-white">{t("settingsCol")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.map((r) => (
                    <TableRow key={r.id}>
                      {cols.name && <TableCell className="font-medium">{r.name}</TableCell>}
                      {cols.username && <TableCell>{r.username}</TableCell>}
                      {cols.email && <TableCell>{r.email}</TableCell>}
                      {cols.position && <TableCell>{r.position}</TableCell>}
                      {cols.settings && (
                        <TableCell className="space-x-2 text-right">
                          <Button size="icon" variant="ghost" aria-label="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => openEdit(r, rows.findIndex((x) => x.id === r.id))}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {current.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        {t("noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
              <div>
                {t("showing")} {current.length} {t("of")} {filtered.length} {t("entries")}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t("prev")}
                </Button>
                <span className="tabular-nums">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  {t("next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editUser")}</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t("name")}</Label>
                <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))} />
              </div>
              <div>
                <Label htmlFor="edit-username">{t("username")}</Label>
                <Input id="edit-username" value={editForm.username} onChange={(e) => setEditForm((f) => (f ? { ...f, username: e.target.value } : f))} />
              </div>
              <div>
                <Label htmlFor="edit-email">{t("email")}</Label>
                <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => (f ? { ...f, email: e.target.value } : f))} />
              </div>
              <div>
                <Label>{t("position")}</Label>
                <Select value={editForm.position} onValueChange={(v) => setEditForm((f) => (f ? { ...f, position: v } : f))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("position")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">{t("admin")}</SelectItem>
                    <SelectItem value="User">{t("user")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleEditSave}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
