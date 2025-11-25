import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supa =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

interface DriverProfile {
  id?: number;
  name: string;
  phone: string;
  password?: string;
  zone?: string;
  active?: boolean;
}

interface DriverTask {
  id: number;
  site_name: string;
  driver_name: string;
  status: string;
  required_liters?: number;
  scheduled_at?: string;
  mission_id?: string;
  admin_status?: string;
  notes?: string;
}

interface DriverNotification {
  id: number;
  title: string;
  message: string;
  created_at: string;
  driver_name: string;
  sent_by?: string;
}

export const handleDriverLogin: RequestHandler = async (req, res) => {
  if (!supa) {
    res.status(500).json({ ok: false, error: "Database not configured" });
    return;
  }

  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ ok: false, error: "Missing username or password" });
    return;
  }

  try {
    // Query driver by name/username
    const { data: drivers, error: queryError } = await supa
      .from("drivers")
      .select("id, name, phone, zone, active, password")
      .ilike("name", username)
      .limit(1);

    if (queryError) {
      console.error("Driver query error:", queryError);
      res.status(500).json({ ok: false, error: "Database error" });
      return;
    }

    const driver = drivers?.[0];
    if (!driver) {
      res.status(401).json({ ok: false, error: "Invalid credentials" });
      return;
    }

    // Validate password (plain text comparison for now - in production, use bcrypt)
    if (driver.password !== password) {
      res.status(401).json({ ok: false, error: "Invalid credentials" });
      return;
    }

    if (!driver.active) {
      res.status(403).json({ ok: false, error: "Driver account is inactive" });
      return;
    }

    // Return driver profile (without password)
    const profile: DriverProfile = {
      id: driver.id,
      name: driver.name,
      phone: driver.phone || "",
      zone: driver.zone,
      active: driver.active,
    };

    res.json({ ok: true, profile });
  } catch (err: any) {
    console.error("Driver login error:", err);
    res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
};

export const handleGetDriverTasks: RequestHandler = async (req, res) => {
  if (!supa) {
    res.status(500).json({ ok: false, error: "Database not configured" });
    return;
  }

  const { driverName, driverPhone } = req.query as {
    driverName?: string;
    driverPhone?: string;
  };

  if (!driverName) {
    res.status(400).json({ ok: false, error: "Missing driverName" });
    return;
  }

  try {
    // Query tasks where driver_name matches OR driver_phone matches
    // This prevents drivers from seeing other drivers' tasks
    const ors = [`driver_name.eq.${driverName}`];
    if (driverPhone?.trim()) {
      ors.push(`driver_phone.eq.${driverPhone}`);
    }

    const { data: tasks, error } = await supa
      .from("driver_tasks")
      .select("*")
      .or(ors.join(","))
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ ok: false, error: "Failed to fetch tasks" });
      return;
    }

    res.json({ ok: true, tasks: tasks || [] });
  } catch (err: any) {
    console.error("Get driver tasks error:", err);
    res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
};

export const handleGetDriverNotifications: RequestHandler = async (
  req,
  res,
) => {
  if (!supa) {
    res.status(500).json({ ok: false, error: "Database not configured" });
    return;
  }

  const { driverName } = req.query as { driverName?: string };

  if (!driverName) {
    res.status(400).json({ ok: false, error: "Missing driverName" });
    return;
  }

  try {
    // Get unread notifications for this driver
    const { data: notifications, error } = await supa
      .from("driver_notifications")
      .select("id, title, message, created_at, driver_name, sent_by")
      .eq("driver_name", driverName)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Get notifications error:", error);
      res
        .status(500)
        .json({ ok: false, error: "Failed to fetch notifications" });
      return;
    }

    res.json({ ok: true, notifications: notifications || [] });
  } catch (err: any) {
    console.error("Get driver notifications error:", err);
    res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
};

export const handleMarkNotificationRead: RequestHandler = async (req, res) => {
  if (!supa) {
    res.status(500).json({ ok: false, error: "Database not configured" });
    return;
  }

  const { notificationId, driverName } = req.body as {
    notificationId?: number;
    driverName?: string;
  };

  if (!notificationId || !driverName) {
    res
      .status(400)
      .json({ ok: false, error: "Missing notificationId or driverName" });
    return;
  }

  try {
    // Record that driver read this notification
    const { error } = await supa.from("driver_notification_reads").insert({
      notification_id: notificationId,
      driver_name: driverName,
      read_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Mark read error:", error);
      res
        .status(500)
        .json({ ok: false, error: "Failed to mark notification as read" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
};

export const handleUpdateTaskStatus: RequestHandler = async (req, res) => {
  if (!supa) {
    res.status(500).json({ ok: false, error: "Database not configured" });
    return;
  }

  const { taskId, status, driverName } = req.body as {
    taskId?: number;
    status?: string;
    driverName?: string;
  };

  if (!taskId || !status || !driverName) {
    res
      .status(400)
      .json({ ok: false, error: "Missing taskId, status, or driverName" });
    return;
  }

  const validStatuses = ["pending", "in_progress", "completed"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ ok: false, error: "Invalid status" });
    return;
  }

  try {
    // Get the task first to verify it belongs to this driver
    const { data: taskData, error: getError } = await supa
      .from("driver_tasks")
      .select("id, driver_name")
      .eq("id", taskId)
      .single();

    if (getError || !taskData) {
      res.status(404).json({ ok: false, error: "Task not found" });
      return;
    }

    // Verify driver owns this task
    if (taskData.driver_name !== driverName) {
      res
        .status(403)
        .json({
          ok: false,
          error: "Unauthorized: Task does not belong to this driver",
        });
      return;
    }

    // Update task status
    const { error: updateError } = await supa
      .from("driver_tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (updateError) {
      console.error("Update task error:", updateError);
      res.status(500).json({ ok: false, error: "Failed to update task" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error("Update task status error:", err);
    res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
};

export const handleRegisterPushToken: RequestHandler = async (req, res) => {
  if (!supa) {
    res.status(500).json({ ok: false, error: "Database not configured" });
    return;
  }

  const { token, driverName, driverPhone, platform } = req.body as {
    token?: string;
    driverName?: string;
    driverPhone?: string;
    platform?: string;
  };

  if (!token) {
    res.status(400).json({ ok: false, error: "Missing token" });
    return;
  }

  try {
    const { error } = await supa.from("driver_push_tokens").upsert(
      {
        token,
        driver_name: driverName || null,
        driver_phone: driverPhone || null,
        platform: platform || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

    if (error) {
      console.error("Register token error:", error);
      res.status(500).json({ ok: false, error: "Failed to register token" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error("Register push token error:", err);
    res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
};
