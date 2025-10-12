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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import { Download, Search, Trash2, CheckSquare, Square } from "lucide-react";

type InvoiceRow = {
  id: number;
  siteName: string;
  driverName: string;
  phone: string;
  startDate: string;
  endDate: string;
  actualFound: number;
  quantityAdded: number;
  totalInvoice: number;
  settlement: string;
};

const initialRows: InvoiceRow[] = [];

export default function ReportsPage() {
  const [project, setProject] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [driver, setDriver] = useState<string>("");
  const [zone, setZone] = useState<string>("All");
  const [driverPaid, setDriverPaid] = useState<string>("Not settled");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<InvoiceRow[]>(initialRows);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.liters += r.quantityAdded;
        acc.tasks += 1;
        acc.paid += r.settlement === "Paid" ? 1 : 0;
        acc.notPaid += r.settlement !== "Paid" ? 1 : 0;
        return acc;
      },
      { liters: 0, tasks: 0, paid: 0, notPaid: 0 },
    );
  }, [rows]);

  const filtered = useMemo(() => {
    let arr = rows;
    if (project) arr = arr.filter(() => true);
    if (driver) arr = arr.filter((r) => r.driverName === driver);
    if (zone && zone !== "All") arr = arr.filter(() => true);
    if (driverPaid !== "All")
      arr = arr.filter((r) =>
        driverPaid === "Paid"
          ? r.settlement === "Paid"
          : r.settlement !== "Paid",
      );
    if (!query) return arr;
    const q = query.toLowerCase();
    return arr.filter((r) =>
      [r.siteName, r.driverName, r.phone].some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    );
  }, [rows, project, driver, zone, driverPaid, query]);

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selected[r.id]);

  const selectAll = () => {
    const s: Record<number, boolean> = { ...selected };
    filtered.forEach((r) => (s[r.id] = true));
    setSelected(s);
  };
  const deselectAll = () => {
    const s: Record<number, boolean> = { ...selected };
    filtered.forEach((r) => delete s[r.id]);
    setSelected(s);
  };

  const exportCsv = () => {
    const head = [
      "Site Name",
      "Driver Name - Phone",
      "Start Date",
      "End Date",
      "Actual Liter Found in Tank",
      "Quantity added",
      "Total invoice",
      "Determine for settlement",
    ].join(",");
    const body = filtered
      .map((r) =>
        [
          r.siteName,
          `${r.driverName} - ${r.phone}`,
          r.startDate,
          r.endDate,
          r.actualFound,
          r.quantityAdded,
          r.totalInvoice,
          r.settlement,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([head + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <Header />
      <div className="px-4 pb-10 pt-4">
        <div className="mb-4 text-sm text-muted-foreground">
          Report for all done tasks for every single project
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div>
                <div className="text-xs text-muted-foreground">Project</div>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Please select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stc-cow">stc-cow</SelectItem>
                    <SelectItem value="mobily">mobily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">From Date</div>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">To Date</div>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Drivers</div>
                <Select value={driver} onValueChange={setDriver}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Some Options" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Irfan">Irfan</SelectItem>
                    <SelectItem value="Zafar">Zafar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Zone</div>
                <Select value={zone} onValueChange={setZone}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="Central">Central</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Driver paid</div>
                <Select value={driverPaid} onValueChange={setDriverPaid}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Not settled" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Not settled">Not settled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button className="bg-sky-600 hover:bg-sky-500">
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
              <div className="ml-auto grid grid-cols-4 gap-3 text-xs text-muted-foreground md:grid-cols-4 lg:grid-cols-4">
                <Input
                  readOnly
                  value={totals.liters}
                  placeholder="Total Liters Used"
                />
                <Input
                  readOnly
                  value={totals.tasks}
                  placeholder="Total Task Done"
                />
                <Input
                  readOnly
                  value={totals.paid}
                  placeholder="Total Invoices Paid"
                />
                <Input
                  readOnly
                  value={totals.notPaid}
                  placeholder="Total Invoices Not Paid"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button variant="secondary" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" /> Select All
              </Button>
              <Button variant="outline">
                <Trash2 className="mr-2 h-4 w-4" /> Deselect all
              </Button>
              <Button variant="outline">Records Selection</Button>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Search</span>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-56"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]">
                    <TableHead className="text-white w-10">Sel</TableHead>
                    <TableHead className="text-white">Site Name</TableHead>
                    <TableHead className="text-white">
                      Driver Name - Phone
                    </TableHead>
                    <TableHead className="text-white">Start Date</TableHead>
                    <TableHead className="text-white">End Date</TableHead>
                    <TableHead className="text-white">
                      Actual Liter Found in Tank
                    </TableHead>
                    <TableHead className="text-white">Quantity added</TableHead>
                    <TableHead className="text-white">Total invoice</TableHead>
                    <TableHead className="text-white">
                      Determine for settlement
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No data available in table
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <button
                          onClick={() =>
                            setSelected((s) => ({ ...s, [r.id]: !s[r.id] }))
                          }
                          aria-label="Select row"
                        >
                          {selected[r.id] ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.siteName}
                      </TableCell>
                      <TableCell>{`${r.driverName} - ${r.phone}`}</TableCell>
                      <TableCell>{r.startDate}</TableCell>
                      <TableCell>{r.endDate}</TableCell>
                      <TableCell>{r.actualFound}</TableCell>
                      <TableCell>{r.quantityAdded}</TableCell>
                      <TableCell>{r.totalInvoice}</TableCell>
                      <TableCell>{r.settlement}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
