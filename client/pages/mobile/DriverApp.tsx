import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import {
  bindDriverToPushNotifications,
  initializePushNotifications,
} from "@/lib/pushNotifications";
import { Bell, Eye, EyeOff, Loader2, PlusCircle } from "lucide-react";
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";

const COMPLETED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const COMPLETION_DATE_KEYS = [
  "local_completed_at",
  "completed_at",
  "driver_completed_at",
  "completedAt",
  "completed_at_local",
  "driver_completed_at_local",
  "submitted_at",
  "finished_at",
  "updated_at",
  "created_at",
] as const;

const getCompletionDate = (task: any): Date | null => {
  if (!task) return null;
  for (const key of COMPLETION_DATE_KEYS) {
    const rawValue = (task as Record<string, unknown>)[key];
    if (!rawValue) continue;
    if (rawValue instanceof Date) {
      const time = rawValue.getTime();
      if (!Number.isNaN(time)) return rawValue;
      continue;
    }
    if (typeof rawValue === "number") {
      const fromNumber = new Date(rawValue);
      if (!Number.isNaN(fromNumber.getTime())) return fromNumber;
      continue;
    }
    if (typeof rawValue === "string") {
      const parsed = new Date(rawValue);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
};

const normalizeSiteKey = (value: string) => value.trim().toLowerCase();

const toNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
};

const getTaskCoordinatePair = (
  task: any,
): { latitude: number; longitude: number } | null => {
  if (!task) return null;
  const latitudeCandidates = [
    task.site_latitude,
    task.latitude,
    task.lat,
    task.siteLatitude,
  ];
  const longitudeCandidates = [
    task.site_longitude,
    task.longitude,
    task.lng,
    task.siteLongitude,
  ];
  let latitude: number | null = null;
  for (const candidate of latitudeCandidates) {
    const numeric = toNumberOrNull(candidate);
    if (numeric !== null) {
      latitude = numeric;
      break;
    }
  }
  let longitude: number | null = null;
  for (const candidate of longitudeCandidates) {
    const numeric = toNumberOrNull(candidate);
    if (numeric !== null) {
      longitude = numeric;
      break;
    }
  }
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
};

export default function DriverApp() {
  const [profile, setProfile] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<boolean>(() => {
    try {
      return (
        (localStorage.getItem("driver.remember") || "true").toLowerCase() ===
        "true"
      );
    } catch {
      return true;
    }
  });
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<
    "all" | "active" | "returned" | "completed"
  >("active");
  const [editOpen, setEditOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isNative = useMemo(() => {
    if (typeof window === "undefined") return false;
    const cap = (window as any).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  }, []);
  const [entry, setEntry] = useState({
    // required fields for this form
    site_id: "",
    mission_id: "",
    actual_liters_in_tank: "",
    quantity_added: "",
    notes: "",
    // image urls (filled after upload)
    counter_before_url: "",
    tank_before_url: "",
    counter_after_url: "",
    tank_after_url: "",
    // legacy/compat fields used by existing submit logic (kept hidden)
    tank_type: "",
    completed_at: "",
    vertical_calculated_liters: "",
    liters: "",
    rate: "",
    station: "",
    receipt: "",
    photo_url: "",
    odometer: "",
  });
  const siteCacheRef = useRef<
    Record<
      string,
      { latitude: number; longitude: number; siteId: string; siteName: string }
    >
  >({});

  // upload state
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const DRIVER_BUCKET = "driver-uploads";

  const keyMap = {
    counter_before: "counter_before_url",
    tank_before: "tank_before_url",
    counter_after: "counter_after_url",
    tank_after: "tank_after_url",
  } as const;

  const handleFile = useCallback(
    async (tag: keyof typeof keyMap, file: File) => {
      const k = keyMap[tag];
      if (file.size > 10 * 1024 * 1024) {
        alert("Max file size is 10MB");
        return;
      }
      setUploading((u) => ({ ...u, [tag]: true }));
      try {
        const dir = `${(profile?.name || "driver").replace(/\s+/g, "_")}/${
          activeTask?.id || "misc"
        }`;
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${dir}/${tag}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from(DRIVER_BUCKET)
          .upload(path, file, {
            upsert: true,
            contentType: file.type || "image/jpeg",
          });
        if (error) {
          alert(`Image upload failed: ${error.message}`);
          return;
        }
        const { data } = supabase.storage
          .from(DRIVER_BUCKET)
          .getPublicUrl(path);
        const url = data.publicUrl;
        setEntry((s: any) => ({ ...s, [k]: url }));
        setPreviews((prev) => ({ ...prev, [tag]: url }));
      } finally {
        setUploading((u) => ({ ...u, [tag]: false }));
      }
    },
    [DRIVER_BUCKET, activeTask?.id, profile?.name],
  );

  const capturePhoto = useCallback(
    async (tag: keyof typeof keyMap) => {
      if (!isNative) return;
      try {
        const permissions = await Camera.checkPermissions();
        if (permissions.camera !== "granted") {
          const granted = await Camera.requestPermissions({
            permissions: ["camera"],
          });
          if (granted.camera !== "granted") {
            alert("Camera permission is required to capture photos.");
            return;
          }
        }

        const photo = await Camera.getPhoto({
          source: CameraSource.Camera,
          direction: CameraDirection.Rear,
          resultType: CameraResultType.Uri,
          quality: 75,
          width: 1600,
        });

        if (!photo.webPath) {
          alert("Unable to access captured image. Please try again.");
          return;
        }

        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const extension =
          photo.format?.toLowerCase() || blob.type.split("/")[1] || "jpg";
        const fileName = `${tag}-${Date.now()}.${extension}`;
        const file = new File([blob], fileName, {
          type: blob.type || "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(file);
        setPreviews((prev) => ({ ...prev, [tag]: previewUrl }));
        await handleFile(tag, file);
      } catch (error) {
        console.error("Camera capture failed", error);
        alert(
          "Unable to launch camera. Please try again or upload from gallery.",
        );
      }
    },
    [handleFile, isNative],
  );

  const ensureTaskHasLocation = useCallback((task: any): any => {
    if (!task) return task;
    const coords = getTaskCoordinatePair(task);
    if (coords) {
      const latMatches = toNumberOrNull(task.site_latitude) === coords.latitude;
      const lonMatches =
        toNumberOrNull(task.site_longitude) === coords.longitude;
      if (latMatches && lonMatches) {
        return task;
      }
      return {
        ...task,
        site_latitude: coords.latitude,
        site_longitude: coords.longitude,
      };
    }
    const idValue =
      task?.site_id !== undefined && task?.site_id !== null
        ? String(task.site_id)
        : "";
    const nameValue =
      task?.site_name !== undefined && task?.site_name !== null
        ? String(task.site_name)
        : "";
    const idKey = idValue ? normalizeSiteKey(idValue) : "";
    const nameKey = nameValue ? normalizeSiteKey(nameValue) : "";
    const cached =
      (idKey && siteCacheRef.current[idKey]) ||
      (nameKey && siteCacheRef.current[nameKey]) ||
      null;
    if (!cached) return task;
    const latMatches = toNumberOrNull(task.site_latitude) === cached.latitude;
    const lonMatches = toNumberOrNull(task.site_longitude) === cached.longitude;
    if (latMatches && lonMatches) return task;
    return {
      ...task,
      site_latitude: cached.latitude,
      site_longitude: cached.longitude,
    };
  }, []);

  const enrichTasksWithCoordinates = useCallback(
    async (taskList: any[]) => {
      if (!taskList || taskList.length === 0) return taskList;
      const numericSiteIds = new Set<number>();
      const siteNames = new Set<string>();

      const initialTasks = taskList.map((task) => {
        const idValue =
          task?.site_id !== undefined && task?.site_id !== null
            ? String(task.site_id)
            : "";
        const nameValue =
          task?.site_name !== undefined && task?.site_name !== null
            ? String(task.site_name)
            : "";
        const idKey = idValue ? normalizeSiteKey(idValue) : "";
        const nameKey = nameValue ? normalizeSiteKey(nameValue) : "";
        const hasCache =
          (idKey && siteCacheRef.current[idKey]) ||
          (nameKey && siteCacheRef.current[nameKey]);

        if (!hasCache) {
          if (idValue) {
            const numericId = Number(idValue);
            if (!Number.isNaN(numericId)) numericSiteIds.add(numericId);
            siteNames.add(idValue);
          }
          if (nameValue) siteNames.add(nameValue);
        }

        return ensureTaskHasLocation(task);
      });

      const queries: Promise<void>[] = [];

      if (numericSiteIds.size > 0) {
        queries.push(
          supabase
            .from("sites")
            .select("id, site_name, latitude, longitude")
            .in("id", Array.from(numericSiteIds))
            .then(({ data, error }) => {
              if (error) {
                console.error("Failed to load site coordinates by id", error);
                return;
              }
              data?.forEach((site: any) => {
                const latitude = toNumberOrNull(site?.latitude);
                const longitude = toNumberOrNull(site?.longitude);
                if (latitude === null || longitude === null) return;
                const entry = {
                  latitude,
                  longitude,
                  siteId: String(site.id ?? ""),
                  siteName: String(site.site_name ?? ""),
                };
                if (site.id !== undefined && site.id !== null) {
                  siteCacheRef.current[normalizeSiteKey(String(site.id))] =
                    entry;
                }
                if (site.site_name) {
                  siteCacheRef.current[
                    normalizeSiteKey(String(site.site_name))
                  ] = entry;
                }
              });
            }),
        );
      }

      const siteNameList = Array.from(siteNames).filter(
        (name) => name.trim().length > 0,
      );
      if (siteNameList.length > 0) {
        queries.push(
          supabase
            .from("sites")
            .select("id, site_name, latitude, longitude")
            .in("site_name", siteNameList)
            .then(({ data, error }) => {
              if (error) {
                console.error("Failed to load site coordinates by name", error);
                return;
              }
              data?.forEach((site: any) => {
                const latitude = toNumberOrNull(site?.latitude);
                const longitude = toNumberOrNull(site?.longitude);
                if (latitude === null || longitude === null) return;
                const entry = {
                  latitude,
                  longitude,
                  siteId: String(site.id ?? ""),
                  siteName: String(site.site_name ?? ""),
                };
                if (site.id !== undefined && site.id !== null) {
                  siteCacheRef.current[normalizeSiteKey(String(site.id))] =
                    entry;
                }
                if (site.site_name) {
                  siteCacheRef.current[
                    normalizeSiteKey(String(site.site_name))
                  ] = entry;
                }
              });
            }),
        );
      }

      if (queries.length > 0) {
        try {
          await Promise.all(queries);
        } catch (error) {
          console.error("Failed to resolve site coordinates", error);
        }
      }

      return initialTasks.map((task) => ensureTaskHasLocation(task));
    },
    [ensureTaskHasLocation],
  );

  const openDirections = useCallback((task: any) => {
    const coords = getTaskCoordinatePair(task);
    if (!coords) {
      alert("Site location data is not available yet for this task.");
      return;
    }
    const destination = `${coords.latitude},${coords.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  useEffect(() => {
    void initializePushNotifications();
  }, []);

  useEffect(() => {
    void bindDriverToPushNotifications(profile);
  }, [profile]);

  useEffect(() => {
    try {
      try {
        const saved = localStorage.getItem("driver.lastUsername");
        if (saved && !name) setName(saved);
      } catch {}
      const getParams = () => {
        const search = window.location.search;
        if (search && search.length > 1) return new URLSearchParams(search);
        const hash = window.location.hash || "";
        const qIndex = hash.indexOf("?");
        if (qIndex >= 0) return new URLSearchParams(hash.substring(qIndex));
        return new URLSearchParams();
      };
      const params = getParams();
      const initialFilter = (params.get("filter") || "active").toLowerCase();
      if (
        initialFilter === "all" ||
        initialFilter === "active" ||
        initialFilter === "returned" ||
        initialFilter === "completed"
      ) {
        setFilterMode(initialFilter as any);
      }
      const demo = params.get("demo") === "1";
      setDemoMode(demo);
      if (demo) {
        const demoProfile = { name: "Demo Driver", phone: "0500000000" };
        setProfile(demoProfile);
        setTasks([
          {
            id: 1001,
            site_name: "Site A",
            site_id: "SITE-A-001",
            driver_name: demoProfile.name,
            driver_phone: demoProfile.phone,
            scheduled_at: new Date().toISOString(),
            status: "pending",
            required_liters: 500,
            notes: "Check tank level before refuel",
          },
          {
            id: 1002,
            site_name: "Site B",
            site_id: "SITE-B-002",
            driver_name: demoProfile.name,
            driver_phone: demoProfile.phone,
            scheduled_at: new Date(Date.now() + 3600000).toISOString(),
            status: "in_progress",
            required_liters: 300,
            notes: "Photograph counter",
          },
        ]);
        if (params.get("open") === "1") {
          setActiveTask({ id: 1001 });
          setEditOpen(true);
        }
        return;
      }
      const raw = localStorage.getItem("driver.profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  const loadTasks = async () => {
    if (!profile || demoMode) return;
    const ors: string[] = [`driver_name.eq.${profile.name}`];
    if (profile.phone && profile.phone.trim())
      ors.push(`driver_phone.eq.${profile.phone}`);
    const { data } = await supabase
      .from("driver_tasks")
      .select("*")
      .or(ors.join(","))
      .order("scheduled_at", { ascending: true });
    const incoming = data || [];
    const now = Date.now();
    const nextTasks: any[] = [];
    for (const task of incoming) {
      if (task?.status === "completed") {
        const completionDate = getCompletionDate(task);
        if (
          completionDate &&
          now - completionDate.getTime() > COMPLETED_RETENTION_MS
        ) {
          continue;
        }
        if (!task.local_completed_at && completionDate) {
          nextTasks.push({
            ...task,
            local_completed_at: completionDate.toISOString(),
          });
          continue;
        }
      }
      nextTasks.push(task);
    }
    let enrichedTasks = nextTasks;
    try {
      enrichedTasks = await enrichTasksWithCoordinates(nextTasks);
    } catch (error) {
      console.error("Failed to enrich tasks with site coordinates", error);
    }
    setTasks(enrichedTasks);
  };

  useEffect(() => {
    loadTasks();
    if (profile && !demoMode) {
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, demoMode]);

  // Realtime sync: listen to driver_tasks changes and update list live
  useEffect(() => {
    if (!profile || demoMode) return;
    let subscription: any = null;

    const handlePayload = async (payload: any, type?: string) => {
      try {
        // normalize payload for different supabase client versions
        const evtType =
          (payload?.eventType as string) || (payload?.event as string) || type || '';
        const row = (payload?.new ?? payload?.record ?? payload?.old) as any;
        if (!row) return;
        const matches =
          (row?.driver_name && row.driver_name === profile.name) ||
          (row?.driver_phone && profile.phone && String(row.driver_phone) === String(profile.phone));
        if (!matches) return;

        if (/delete/i.test(evtType)) {
          setTasks((arr) => arr.filter((t) => t.id !== row.id));
          return;
        }

        const nextRow = payload.new ?? payload.record ?? row;
        const enriched = await enrichTasksWithCoordinates([nextRow]);
        const finalRow = enriched && enriched[0] ? enriched[0] : nextRow;

        setTasks((arr) => {
          const exists = arr.some((t) => t.id === finalRow.id);
          const updated = exists
            ? arr.map((t) => (t.id === finalRow.id ? { ...t, ...finalRow } : t))
            : [...arr, finalRow];
          return updated
            .slice()
            .sort((a: any, b: any) => {
              const aDone = a?.status === 'completed' ? 1 : 0;
              const bDone = b?.status === 'completed' ? 1 : 0;
              if (aDone !== bDone) return aDone - bDone;
              const aTime = a?.scheduled_at ? Date.parse(a.scheduled_at) : 0;
              const bTime = b?.scheduled_at ? Date.parse(b.scheduled_at) : 0;
              return aTime - bTime;
            });
        });
      } catch (err) {
        console.error('Realtime update failed', err);
      }
    };

    const setupRealtime = async () => {
      try {
        // supabase-js v2 realtime
        if (typeof (supabase as any).channel === 'function') {
          subscription = (supabase as any)
            .channel(`driver_tasks:${profile.name || 'anon'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_tasks' }, handlePayload)
            .subscribe();
          return;
        }

        // legacy supabase-js v1 realtime
        if (typeof (supabase as any).from === 'function') {
          subscription = (supabase as any)
            .from('driver_tasks')
            .on('INSERT', (p: any) => handlePayload(p, 'INSERT'))
            .on('UPDATE', (p: any) => handlePayload(p, 'UPDATE'))
            .on('DELETE', (p: any) => handlePayload(p, 'DELETE'))
            .subscribe?.();
          return;
        }

        console.info('Realtime not available on this supabase client');
      } catch (err) {
        console.error('Failed to setup realtime subscription', err);
      }
    };

    void setupRealtime();

    return () => {
      try {
        if (!subscription) return;
        if (typeof (supabase as any).removeChannel === 'function') {
          try {
            (supabase as any).removeChannel(subscription);
            return;
          } catch {}
        }
        if (typeof subscription.unsubscribe === 'function') {
          try {
            subscription.unsubscribe();
            return;
          } catch {}
        }
        if (typeof (supabase as any).removeSubscription === 'function') {
          try {
            (supabase as any).removeSubscription(subscription);
            return;
          } catch {}
        }
      } catch (err) {
        // ignore
      }
    };
  }, [profile, demoMode, enrichTasksWithCoordinates]);

  useEffect(() => {
    try {
      localStorage.setItem("driver.remember", String(remember));
      if (remember && name) localStorage.setItem("driver.lastUsername", name);
    } catch {}
  }, [remember, name]);

  const applyFilter = (next: "all" | "active" | "returned" | "completed") => {
    setFilterMode(next);
    try {
      const url = new URL(window.location.href);
      // keep hash routing, add/update filter param
      const hash = url.hash || "#";
      const [path, q] = hash.split("?");
      const params = new URLSearchParams(q || "");
      params.set("filter", next);
      const newHash = `${path}?${params.toString()}`;
      if (newHash !== hash) {
        url.hash = newHash;
        history.replaceState(null, "", url.toString());
      }
    } catch {}
  };
  const activeCount = useMemo(
    () => tasks.filter((t) => t.status === "in_progress").length,
    [tasks],
  );
  const pendingCount = useMemo(
    () => tasks.filter((t) => t.status === "pending").length,
    [tasks],
  );
  const returnedCount = useMemo(
    () =>
      tasks.filter((t) => t.admin_status === "Task returned to the driver")
        .length,
    [tasks],
  );
  const openCount = useMemo(
    () => tasks.filter((t) => t.status !== "completed").length,
    [tasks],
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === "completed").length,
    [tasks],
  );
  const activeTotal = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== "completed" &&
          t.admin_status !== "Task returned to the driver",
      ).length,
    [tasks],
  );

  const loadNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("driver_notifications")
      .select("id, created_at, title, message, driver_name, sent_by")
      .or(`driver_name.is.null,driver_name.eq.${profile.name}`)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data || []);
    const ids = (data || []).map((n: any) => n.id);
    if (ids.length === 0) {
      setUnreadCount(0);
      return;
    }
    const { data: reads } = await supabase
      .from("driver_notification_reads")
      .select("notification_id")
      .eq("driver_name", profile.name)
      .in("notification_id", ids);
    const readSet = new Set((reads || []).map((r: any) => r.notification_id));
    const unread = ids.filter((id: number) => !readSet.has(id)).length;
    setUnreadCount(unread);
  };

  const filtered = useMemo(() => {
    let base = tasks;
    if (filterMode === "completed") {
      base = base.filter((t) => t.status === "completed");
    } else {
      base = base.filter((t) => t.status !== "completed");
      if (filterMode === "active")
        base = base.filter(
          (t) => t.status === "in_progress" || t.status === "pending",
        );
      if (filterMode === "returned")
        base = base.filter(
          (t) => t.admin_status === "Task returned to the driver",
        );
    }
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter((t) =>
      [t.site_name, t.status, t.notes].some((v: any) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [tasks, query, filterMode]);

  const rotateRight = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  const fetchDriver = async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) return { row: null, error: null };

    const searchColumns = ["name", "email", "phone"].filter((col) =>
      Boolean(col),
    );
    let lastError: any = null;

    const numericCandidate = Number.parseInt(trimmed, 10);
    const numericId =
      Number.isFinite(numericCandidate) && /^\d+$/.test(trimmed)
        ? numericCandidate
        : null;

    if (numericId !== null) {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", numericId)
        .limit(1);
      if (error) {
        lastError = error;
      } else if (data && data.length > 0) {
        return { row: data[0] as any, error: null };
      }
    }

    const normalizedPattern = trimmed
      .replace(/[%_]/g, (match) => `\\${match}`)
      .replace(/\s+/g, "%");

    for (const column of searchColumns) {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .ilike(column, `%${normalizedPattern}%`)
        .order("id", { ascending: false })
        .limit(1);
      if (error) {
        lastError = error;
        continue;
      }
      if (data && data.length > 0) {
        return { row: data[0] as any, error: null };
      }
    }
    return { row: null, error: lastError };
  };

  const sha256Fallback = (message: string) => {
    const encoder = new TextEncoder();
    const input = encoder.encode(message);
    const bitLength = input.length * 8;
    const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
    const withPadding = new Uint8Array(paddedLength);
    withPadding.set(input);
    withPadding[input.length] = 0x80;
    const view = new DataView(withPadding.buffer);
    const bitLenHigh = Math.floor(bitLength / 0x100000000);
    const bitLenLow = bitLength >>> 0;
    view.setUint32(withPadding.length - 8, bitLenHigh, false);
    view.setUint32(withPadding.length - 4, bitLenLow, false);

    const K = new Uint32Array([
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]);

    const w = new Uint32Array(64);
    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;

    for (let i = 0; i < withPadding.length; i += 64) {
      for (let t = 0; t < 16; t += 1) {
        w[t] = view.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 64; t += 1) {
        const s0 =
          rotateRight(w[t - 15], 7) ^
          rotateRight(w[t - 15], 18) ^
          (w[t - 15] >>> 3);
        const s1 =
          rotateRight(w[t - 2], 17) ^
          rotateRight(w[t - 2], 19) ^
          (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }

      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      let f = h5;
      let g = h6;
      let h = h7;

      for (let t = 0; t < 64; t += 1) {
        const S1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        const S0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }

    const toHex = (value: number) => value.toString(16).padStart(8, "0");
    return (
      toHex(h0) +
      toHex(h1) +
      toHex(h2) +
      toHex(h3) +
      toHex(h4) +
      toHex(h5) +
      toHex(h6) +
      toHex(h7)
    );
  };

  const sha256 = async (text: string) => {
    const cryptoObj =
      typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    if (cryptoObj?.subtle) {
      try {
        const enc = new TextEncoder().encode(text);
        const buf = await cryptoObj.subtle.digest("SHA-256", enc);
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch (err) {
        console.warn("Falling back to pure JS SHA-256", err);
      }
    }
    return sha256Fallback(text);
  };

  const verifyPassword = async () => {
    setErrorMsg("");
    const n = name.trim();
    const pw = password.trim();
    if (!n || !pw) {
      setErrorMsg("Enter username and password");
      return;
    }
    setVerifying(true);
    try {
      // If Supabase isn't configured, allow local demo login
      const { SUPABASE_CONFIGURED } = await import("@/lib/supabase");
      if (!SUPABASE_CONFIGURED) {
        const prof = { name: n, phone: "" };
        setProfile(prof);
        setDemoMode(true);
        try {
          if (remember)
            localStorage.setItem("driver.profile", JSON.stringify(prof));
          localStorage.setItem("driver.demo", "true");
        } catch {}
        return;
      }
      const { row, error } = await fetchDriver(n);
      if (error) {
        console.error("Driver lookup failed", error);
        setErrorMsg("Login unavailable");
        return;
      }
      if (!row || ("active" in row && row.active === false)) {
        setErrorMsg("Account not found or inactive");
        return;
      }

      const storedHash =
        typeof row.password_sha256 === "string"
          ? row.password_sha256.toLowerCase()
          : null;
      if (storedHash) {
        const hash = (await sha256(pw)).toLowerCase();
        if (hash !== storedHash) {
          setErrorMsg("Invalid password");
          return;
        }
      } else if (typeof row.password === "string") {
        if (row.password.trim() !== pw) {
          setErrorMsg("Invalid password");
          return;
        }
      } else {
        setErrorMsg("Password not configured");
        return;
      }

      const prof = {
        name: (row.name as string) || n,
        phone: (row.phone as string) || "",
      };
      setProfile(prof);
      try {
        if (remember)
          localStorage.setItem("driver.profile", JSON.stringify(prof));
      } catch (storageError) {
        console.warn("Failed to persist driver profile", storageError);
      }
    } catch (err) {
      console.error("Login failed", err);
      setErrorMsg("Login failed. Check connection and try again.");
    } finally {
      setVerifying(false);
    }
  };

  const logout = () => {
    setProfile(null);
    void bindDriverToPushNotifications(null);
    try {
      localStorage.removeItem("driver.profile");
    } catch {}
  };

  const startTask = async (t: any) => {
    const { error } = await supabase
      .from("driver_tasks")
      .update({ status: "in_progress" })
      .eq("id", t.id);
    if (!error)
      setTasks((arr) =>
        arr.map((x) => (x.id === t.id ? { ...x, status: "in_progress" } : x)),
      );
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Task started',
          message: `Driver ${profile?.name || ''} started task #${t.id} at ${t.site_name || 'site'}`,
          driver_names: [profile?.name || '']
        })
      }).catch(() => {});
    } catch {}
  };

  const openComplete = (t: any) => {
    setActiveTask(t);
    setEntry({
      site_id: String(t.site_id ?? t.site_name ?? ""),
      mission_id: String(t.id || ""),
      actual_liters_in_tank: "",
      quantity_added: "",
      notes: t.notes || "",
      counter_before_url: "",
      tank_before_url: "",
      counter_after_url: "",
      tank_after_url: "",
      tank_type: "",
      completed_at: "",
      vertical_calculated_liters: "",
      liters: "",
      rate: "",
      station: "",
      receipt: "",
      photo_url: "",
      odometer: "",
    });
    setPreviews({});
    setEditOpen(true);
  };

  const reportIssue = async (t: any) => {
    try {
      let note = "";
      if (typeof window !== "undefined") {
        note = window.prompt("Describe the issue", "") || "";
      }
      await supabase
        .from("driver_tasks")
        .update({ status: "issue", notes: note || null })
        .eq("id", t.id);
      setTasks((arr) =>
        arr.map((x) =>
          x.id === t.id ? { ...x, status: "issue", notes: note || x.notes } : x,
        ),
      );
    } catch (e) {
      console.error("Failed to report issue", e);
    }
  };
  const saveCompletion = async () => {
    if (!activeTask) return;
    const qty = parseFloat(entry.quantity_added || entry.liters || "0");
    const rate = entry.rate ? parseFloat(entry.rate) : null;
    const odometer = entry.odometer ? parseInt(entry.odometer) : null;
    const completedAtIso = new Date().toISOString();
    await supabase.from("driver_task_entries").insert({
      task_id: activeTask.id,
      liters: qty,
      rate,
      station: entry.station || null,
      receipt_number: entry.receipt || null,
      photo_url: entry.photo_url || null,
      odometer: odometer as any,
      submitted_by: profile?.name || null,
    });
    const { error } = await supabase
      .from("driver_tasks")
      .update({
        status: "completed",
        notes: entry.notes || null,
        completed_at: completedAtIso,
      })
      .eq("id", activeTask.id);
    if (error) {
      await supabase
        .from("driver_tasks")
        .update({ status: "completed", notes: entry.notes || null })
        .eq("id", activeTask.id);
    }
    setTasks((arr) => {
      const now = Date.now();
      return arr
        .map((task) =>
          task.id === activeTask.id
            ? {
                ...task,
                status: "completed",
                notes: entry.notes || null,
                local_completed_at: completedAtIso,
              }
            : task,
        )
        .filter((task) => {
          if (task.status !== "completed") return true;
          const completionDate =
            getCompletionDate(task) ||
            (task.local_completed_at
              ? new Date(task.local_completed_at)
              : null);
          if (!completionDate) return true;
          return now - completionDate.getTime() <= COMPLETED_RETENTION_MS;
        });
    });
    setEditOpen(false);
    setActiveTask(null);
  };

  const getStatusBadge = (task: any) => {
    if (task.admin_status === "Task returned to the driver") {
      return {
        label: "Returned",
        className: "bg-[#FDE8EA] text-[#E52329]",
      };
    }

    switch (task.status) {
      case "in_progress":
        return {
          label: "In Progress",
          className: "bg-[#202B6D] text-white",
        };
      case "completed":
        return {
          label: "Completed",
          className: "bg-[#1F9254] text-white",
        };
      case "failed":
      case "issue":
        return {
          label: "Issue",
          className: "bg-[#E52329] text-white",
        };
      case "pending":
      default:
        return {
          label: "Pending",
          className: "bg-[#E6E9F5] text-[#202B6D]",
        };
    }
  };

  const filterOptions: {
    key: "active" | "returned" | "all" | "completed";
    label: string;
  }[] = [
    { key: "active", label: "Active task" },
    { key: "returned", label: "Returned tasks" },
    { key: "completed", label: "Completed" },
    { key: "all", label: "All tasks" },
  ];

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] px-5 py-0 sm:py-12">
        <div className="w-full max-w-sm space-y-9">
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2Fdf60032fd7d44277b7f568b8478ff12e?format=webp&width=800"
                alt="ACES logo"
                className="mx-auto block h-[120px] w-[150px] min-h-[100px] max-w-[200%]"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="text-3xl font-bold text-[#202B6D]">Driver App</p>
            <p className="text-sm text-[#6B7280]">
              Sign in with your assigned credentials to access fueling tasks.
            </p>
          </div>
          <Card className="rounded-2xl border border-[#D1D5DB] bg-white shadow-[0_20px_45px_rgba(32,43,109,0.12)]">
            <CardContent className="space-y-6 p-7">
              <div className="space-y-2 text-left">
                <Label
                  htmlFor="name"
                  className="flex items-center gap-1 text-sm font-semibold text-[#111827]"
                >
                  Username
                  <span className="text-[#E52329]">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter username"
                  className="h-12 rounded-xl border border-[#D1D5DB] bg-white text-base text-[#111827] placeholder:text-[#6B7280] focus-visible:border-[#202B6D] focus-visible:ring-2 focus-visible:ring-[#202B6D]/30 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2 text-left">
                <Label
                  htmlFor="pw"
                  className="flex items-center gap-1 text-sm font-semibold text-[#111827]"
                >
                  Password
                  <span className="text-[#E52329]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-12 rounded-xl border border-[#D1D5DB] bg-white pr-12 text-base text-[#111827] placeholder:text-[#6B7280] focus-visible:border-[#202B6D] focus-visible:ring-2 focus-visible:ring-[#202B6D]/30 focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-[#6B7280] transition hover:text-[#202B6D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202B6D]/30 focus-visible:ring-offset-0"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex select-none items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#202B6D] focus:ring-[#202B6D]"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
              </div>
              {errorMsg && (
                <div
                  className="rounded-xl border border-[#F4A5A8] bg-[#FDE8EA] px-3 py-2 text-sm font-semibold text-[#E52329]"
                  role="alert"
                >
                  {errorMsg}
                </div>
              )}
              <Button
                className="h-12 w-full rounded-xl bg-[#202B6D] text-base font-bold uppercase tracking-wide text-white shadow-md shadow-[#202B6D]/20 transition hover:bg-[#1A2358] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202B6D]/35 focus-visible:ring-offset-0 disabled:bg-[#202B6D]/60"
                onClick={verifyPassword}
                disabled={verifying}
              >
                {verifying ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </Button>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-[#6B7280]">
            Powered by{" "}
            <span className="font-semibold text-[#202B6D]">ACES</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6 pb-12">
        <header className="rounded-3xl border border-[#D1D5DB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2Fdf60032fd7d44277b7f568b8478ff12e?format=webp&width=800"
                alt="ACES logo"
                className="h-[120px] w-[150px] min-h-[100px] max-w-[200%]"
                loading="eager"
                decoding="async"
              />
              <div>
                <p className="text-xs uppercase tracking-wide text-[#6B7280]">
                  Signed in as
                </p>
                <p className="text-lg font-semibold text-[#111827]">
                  {profile.name}
                </p>
                {profile.phone ? (
                  <p className="text-xs text-[#6B7280]">{profile.phone}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  className="h-10 w-10 rounded-full border border-[#D1D5DB] bg-white text-[#111827] shadow-sm transition hover:bg-[#F4F5F7]"
                  onClick={async () => {
                    await loadNotifications();
                    const ids = (notifications || []).map((n) => n.id);
                    if (ids.length > 0) {
                      const rows = ids.map((id) => ({
                        notification_id: id,
                        driver_name: profile.name,
                      }));
                      await supabase
                        .from("driver_notification_reads")
                        .upsert(rows, {
                          onConflict: "notification_id,driver_name",
                        } as any);
                      setUnreadCount(0);
                    }
                    setNotifOpen(true);
                  }}
                >
                  <Bell className="h-5 w-5" />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#E52329] px-1 text-center text-[11px] font-semibold leading-4 text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                className="rounded-full border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-semibold text-[#202B6D] shadow-sm transition hover:bg-[#F4F5F7]"
                onClick={loadTasks}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                className="rounded-full border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-semibold text-[#E52329] shadow-sm transition hover:bg-[#FDE8EA]"
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              className="h-11 rounded-xl border border-[#D1D5DB] bg-white text-sm text-[#111827] placeholder:text-[#6B7280] focus-visible:border-[#202B6D] focus-visible:ring-2 focus-visible:ring-[#202B6D]/30 focus-visible:ring-offset-0"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {filterOptions.map((option) => {
              const isActive = filterMode === option.key;
              const count =
                option.key === "active"
                  ? activeTotal
                  : option.key === "returned"
                    ? returnedCount
                    : option.key === "completed"
                      ? completedCount
                      : openCount;
              const badgeColor =
                option.key === "active"
                  ? "bg-[#E6E9F5] text-[#202B6D]"
                  : option.key === "returned"
                    ? "bg-[#FDE8EA] text-[#E52329]"
                    : option.key === "completed"
                      ? "bg-[#E6F4EA] text-[#1F9254]"
                      : "bg-[#EEF2F7] text-[#374151]";
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    applyFilter(option.key as any);
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#202B6D]/30 ${
                    isActive
                      ? "border border-transparent bg-[#202B6D] text-white shadow"
                      : "border border-[#D1D5DB] bg-white text-[#111827] hover:border-[#202B6D] hover:text-[#202B6D]"
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        <section className="space-y-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#202B6D]/30 bg-white p-10 text-center text-sm text-[#6B7280]">
              <PlusCircle className="mb-2 h-10 w-10 text-[#D1D5DB]" />
              {filterMode === "returned"
                ? "No returned tasks at the moment."
                : "No fueling missions assigned yet."}
            </div>
          ) : (
            filtered.map((t) => {
              const badge = getStatusBadge(t);
              const coords = getTaskCoordinatePair(t);
              const hasRoute = Boolean(coords);
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-[#D1D5DB] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-[#6B7280]">
                        {new Date(
                          t.scheduled_at || Date.now(),
                        ).toLocaleString()}
                      </p>
                      <h2 className="text-lg font-semibold text-[#111827]">
                        {t.site_name || "Unnamed Site"}
                      </h2>
                      <p className="text-sm text-[#6B7280]">
                        Driver: {t.driver_name || profile.name}
                      </p>
                    </div>
                    <span
                      className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-[#111827]">
                    <p>
                      <span className="font-semibold text-[#6B7280]">
                        Task ID:
                      </span>{" "}
                      {t.id != null && t.id !== ""
                        ? String(t.id)
                        : t.site_id || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-[#6B7280]">
                        Required Liters:
                      </span>{" "}
                      {t.required_liters ?? "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-[#6B7280]">
                        Notes:
                      </span>{" "}
                      {t.notes && t.notes.trim() ? t.notes : "-"}
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        hasRoute
                          ? "border-[#202B6D] text-[#202B6D] hover:bg-[#202B6D] hover:text-white"
                          : "border-[#D1D5DB] text-[#9CA3AF]"
                      }`}
                      onClick={() => openDirections(t)}
                      disabled={!hasRoute}
                    >
                      Get Route
                    </Button>
                    {t.status === "pending" && (
                      <Button
                        className="rounded-xl bg-[#202B6D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1A2358]"
                        onClick={() => startTask(t)}
                      >
                        Start
                      </Button>
                    )}
                    {t.status !== "completed" && (
                      <Button
                        className="rounded-xl bg-[#E52329] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C41D25]"
                        onClick={() => openComplete(t)}
                      >
                        Complete
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="rounded-xl border border-[#D1D5DB] px-4 py-2 text-sm font-semibold text-[#9CA3AF] hover:bg-[#FDE8EA] hover:text-[#E52329]"
                      onClick={() => reportIssue(t)}
                    >
                      Report Issue
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No notifications
              </div>
            )}
            {notifications.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="whitespace-pre-line text-sm text-muted-foreground">
                        {n.message}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="site_id">Site ID</Label>
                <Input id="site_id" value={entry.site_id} readOnly disabled />
              </div>
              <div>
                <Label htmlFor="mission_id">Mission ID</Label>
                <Input
                  id="mission_id"
                  value={entry.mission_id}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="actual_liters_in_tank">
                  Actual Liters in Tank
                </Label>
                <Input
                  id="actual_liters_in_tank"
                  inputMode="decimal"
                  value={entry.actual_liters_in_tank}
                  onChange={(e) =>
                    setEntry((s) => ({
                      ...s,
                      actual_liters_in_tank: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="quantity_added">Quantity Added</Label>
                <Input
                  id="quantity_added"
                  inputMode="decimal"
                  value={entry.quantity_added}
                  onChange={(e) =>
                    setEntry((s) => ({ ...s, quantity_added: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Image: Counter Before</Label>
                {isNative ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-xl border border-dashed border-[#202B6D]/50 text-sm font-semibold text-[#202B6D]"
                    onClick={() => capturePhoto("counter_before")}
                    disabled={uploading.counter_before}
                  >
                    {uploading.counter_before
                      ? "Capturing..."
                      : "Capture photo"}
                  </Button>
                ) : (
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      setPreviews((p) => ({ ...p, counter_before: url }));
                      await handleFile("counter_before", f);
                    }}
                  />
                )}
                {(previews.counter_before || entry.counter_before_url) && (
                  <img
                    src={previews.counter_before || entry.counter_before_url}
                    alt="Counter before"
                    className="mt-2 h-24 w-24 rounded object-cover"
                  />
                )}
                {uploading.counter_before && (
                  <div className="text-xs text-muted-foreground">
                    Uploading...
                  </div>
                )}
              </div>
              <div>
                <Label>Image: Tank Before</Label>
                {isNative ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-xl border border-dashed border-[#202B6D]/50 text-sm font-semibold text-[#202B6D]"
                    onClick={() => capturePhoto("tank_before")}
                    disabled={uploading.tank_before}
                  >
                    {uploading.tank_before ? "Capturing..." : "Capture photo"}
                  </Button>
                ) : (
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      setPreviews((p) => ({ ...p, tank_before: url }));
                      await handleFile("tank_before", f);
                    }}
                  />
                )}
                {(previews.tank_before || entry.tank_before_url) && (
                  <img
                    src={previews.tank_before || entry.tank_before_url}
                    alt="Tank before"
                    className="mt-2 h-24 w-24 rounded object-cover"
                  />
                )}
                {uploading.tank_before && (
                  <div className="text-xs text-muted-foreground">
                    Uploading...
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Image: Counter After</Label>
                {isNative ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-xl border border-dashed border-[#202B6D]/50 text-sm font-semibold text-[#202B6D]"
                    onClick={() => capturePhoto("counter_after")}
                    disabled={uploading.counter_after}
                  >
                    {uploading.counter_after ? "Capturing..." : "Capture photo"}
                  </Button>
                ) : (
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      setPreviews((p) => ({ ...p, counter_after: url }));
                      await handleFile("counter_after", f);
                    }}
                  />
                )}
                {(previews.counter_after || entry.counter_after_url) && (
                  <img
                    src={previews.counter_after || entry.counter_after_url}
                    alt="Counter after"
                    className="mt-2 h-24 w-24 rounded object-cover"
                  />
                )}
                {uploading.counter_after && (
                  <div className="text-xs text-muted-foreground">
                    Uploading...
                  </div>
                )}
              </div>
              <div>
                <Label>Image: Tank After</Label>
                {isNative ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-xl border border-dashed border-[#202B6D]/50 text-sm font-semibold text-[#202B6D]"
                    onClick={() => capturePhoto("tank_after")}
                    disabled={uploading.tank_after}
                  >
                    {uploading.tank_after ? "Capturing..." : "Capture photo"}
                  </Button>
                ) : (
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      setPreviews((p) => ({ ...p, tank_after: url }));
                      await handleFile("tank_after", f);
                    }}
                  />
                )}
                {(previews.tank_after || entry.tank_after_url) && (
                  <img
                    src={previews.tank_after || entry.tank_after_url}
                    alt="Tank after"
                    className="mt-2 h-24 w-24 rounded object-cover"
                  />
                )}
                {uploading.tank_after && (
                  <div className="text-xs text-muted-foreground">
                    Uploading...
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Remarks</Label>
              <Textarea
                id="notes"
                value={entry.notes}
                onChange={(e) =>
                  setEntry((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCompletion}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
