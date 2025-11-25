import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Fuel,
  History,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
import { useMemo } from "react";
import { DeviceFrame } from "./DeviceFrame";

const baseTasks = [
  {
    id: 1,
    site: "Storage Yard Gate A",
    scheduledAt: "08:30 AM",
    vehicle: "Fleet Truck 24",
    status: "Pending",
    fuelType: "Diesel",
    requiredGallons: 120,
    priority: "High",
  },
  {
    id: 2,
    site: "Dock Warehouse 3",
    scheduledAt: "10:15 AM",
    vehicle: "Generator Zone 2",
    status: "In Progress",
    fuelType: "Gasoline",
    requiredGallons: 80,
    priority: "Standard",
  },
  {
    id: 3,
    site: "Logistics Hub - Bay 6",
    scheduledAt: "12:45 PM",
    vehicle: "Fleet Truck 11",
    status: "Pending",
    fuelType: "Diesel",
    requiredGallons: 65,
    priority: "Standard",
  },
];

const historyLogs = [
  {
    id: 901,
    date: "Today · 07:40",
    site: "Hangar - Stand 4",
    gallons: 94,
    notes: "Photos synced to portal",
  },
  {
    id: 902,
    date: "Yesterday · 15:05",
    site: "Storage Yard Gate A",
    gallons: 125,
    notes: "Return visit completed",
  },
  {
    id: 903,
    date: "Yesterday · 11:20",
    site: "Depot 7",
    gallons: 72,
    notes: "",
  },
];

export function DriverMobilePreview() {
  const activeTask = useMemo(() => baseTasks[0], []);

  return (
    <Tabs defaultValue="tasks" className="w-full">
      <TabsList className="mb-4 grid grid-cols-2 gap-2 bg-transparent p-0">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="detail">Task Detail</TabsTrigger>
        <TabsTrigger value="complete">Complete Task</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <DeviceFrame title="Driver Login">
          <div className="flex h-full flex-col gap-6 bg-white p-6">
            <div className="flex flex-col gap-2 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
                <Lock className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Sign in to ACES MSD Fuel Driver</h2>
                <p className="text-sm text-muted-foreground">
                  Drivers use company credentials to access their fueling queue.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="driver-email">Username</Label>
                <Input id="driver-email" placeholder="driver@acesfuel.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-password">Password</Label>
                <Input
                  id="driver-password"
                  type="password"
                  placeholder="Enter password"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border border-border"
                  />
                  <span>Remember me</span>
                </label>
                <button className="text-primary">Reset password</button>
              </div>
              <Button className="w-full">Sign In</Button>
            </div>
            <Separator />
            <div className="text-center text-xs text-muted-foreground">
              Need help? Contact dispatch at +971 55 000 0000.
            </div>
          </div>
        </DeviceFrame>
      </TabsContent>
      <TabsContent value="tasks">
        <DeviceFrame title="Task Queue">
          <div className="space-y-4 bg-white p-5">
            <header className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Today</p>
                <h2 className="text-xl font-semibold">3 Assignments</h2>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                08:12
              </Badge>
            </header>
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Driver</p>
                  <p className="font-semibold">Kareem Al Yassi</p>
                  <p className="text-xs text-muted-foreground">
                    ID 784-2019-9910
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {baseTasks.map((task) => (
                <Card key={task.id} className="border border-border/70">
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={cn(
                          "bg-primary/10 text-primary",
                          task.status === "In Progress" &&
                            "bg-amber-500/15 text-amber-600",
                        )}
                      >
                        {task.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {task.scheduledAt}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{task.site}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {task.vehicle}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" />
                      {task.fuelType} · {task.requiredGallons} gal
                    </div>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Priority: {task.priority}
                    </div>
                    <Button className="mt-4 w-full" variant="secondary">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DeviceFrame>
      </TabsContent>
      <TabsContent value="detail">
        <DeviceFrame title="Assignment Detail">
          <div className="space-y-4 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Now</p>
                <h2 className="text-xl font-semibold">Storage Yard Gate A</h2>
                <p className="text-sm text-muted-foreground">
                  Fleet Truck 24 · Diesel
                </p>
              </div>
              <Badge className="bg-amber-500/20 text-amber-600">
                In Progress
              </Badge>
            </div>
            <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
              <InfoRow icon={Clock} label="Scheduled" value="08:30 AM" />
              <InfoRow
                icon={Phone}
                label="Contact"
                value="Dispatch · +971 55 000 0000"
              />
              <InfoRow
                icon={MessageCircle}
                label="Special Notes"
                value="Capture counter photos before and after fueling."
              />
            </div>
            <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Checklist
              </h3>
              <ChecklistItem
                icon={CheckSquare}
                label="Arrived onsite"
                complete
              />
              <ChecklistItem
                icon={CheckSquare}
                label="Verified vehicle shutdown"
                complete
              />
              <ChecklistItem icon={CheckSquare} label="Started fueling" />
              <ChecklistItem
                icon={CheckSquare}
                label="Captured counter photos"
              />
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" variant="secondary">
                Pause Task
              </Button>
              <Button className="flex-1">Continue</Button>
            </div>
          </div>
        </DeviceFrame>
      </TabsContent>
      <TabsContent value="complete">
        <DeviceFrame title="Complete Task">
          <div className="space-y-4 bg-white p-5">
            <div>
              <h2 className="text-xl font-semibold">Wrap Up</h2>
              <p className="text-sm text-muted-foreground">
                Log fueling details to sync with the web portal immediately.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid gap-2">
                <Label htmlFor="gallons">Gallons Dispensed</Label>
                <Input
                  id="gallons"
                  placeholder="0"
                  defaultValue={activeTask.requiredGallons}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="odometer">Odometer</Label>
                <Input id="odometer" placeholder="Optional" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add fueling notes or exceptions"
                  rows={3}
                />
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              Upload counter and tank photos to complete submission. Photos sync
              to dispatch immediately.
            </div>
            <Button className="w-full">Submit &amp; Complete</Button>
          </div>
        </DeviceFrame>
      </TabsContent>
      <TabsContent value="history">
        <DeviceFrame title="History">
          <div className="space-y-4 bg-white p-5">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Fuel Logs</h2>
                <p className="text-sm text-muted-foreground">
                  Last 7 submissions
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <History className="h-3.5 w-3.5" />
                Export
              </Badge>
            </header>
            <div className="space-y-3">
              {historyLogs.map((log) => (
                <Card key={log.id} className="border border-border/70">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {log.date}
                      </p>
                      <CardTitle className="text-base">{log.site}</CardTitle>
                    </div>
                    <Badge className="bg-primary/10 text-primary">
                      {log.gallons} gal
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {log.notes || "No additional notes provided."}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DeviceFrame>
      </TabsContent>
    </Tabs>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ChecklistItem({
  icon: Icon,
  label,
  complete,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  complete?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-background/80 p-3 text-sm">
      <Icon
        className={cn(
          "h-4 w-4",
          complete ? "text-primary" : "text-muted-foreground",
        )}
      />
      <p
        className={cn(
          "flex-1",
          complete ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      {complete ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
    </div>
  );
}
