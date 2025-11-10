import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  handleDriverLogin,
  handleGetDriverTasks,
  handleGetDriverNotifications,
  handleMarkNotificationRead,
  handleUpdateTaskStatus,
  handleRegisterPushToken,
} from "./routes/driver-api";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || "";

const supa =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : (null as any);

async function sendFcm(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
) {
  if (!FCM_SERVER_KEY) throw new Error("FCM not configured");
  if (!tokens.length) return { ok: true, sent: 0 };
  const url = "https://fcm.googleapis.com/fcm/send"; // Legacy HTTP API
  const body = {
    registration_ids: tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {},
    priority: "high",
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `key=${FCM_SERVER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok)
    throw new Error(`FCM error ${resp.status}: ${JSON.stringify(json)}`);
  return json;
}

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });


  // Driver API routes
  app.post("/api/driver/login", handleDriverLogin);
  app.get("/api/driver/tasks", handleGetDriverTasks);
  app.get("/api/driver/notifications", handleGetDriverNotifications);
  app.post("/api/driver/notifications/read", handleMarkNotificationRead);
  app.post("/api/driver/tasks/update-status", handleUpdateTaskStatus);
  app.post("/api/driver/push-token/register", handleRegisterPushToken);


  // Send push notification to drivers
  app.post("/api/notify", async (req, res) => {
    try {
      const { title, message, data, driver_names } = req.body as {
        title?: string;
        message?: string;
        data?: Record<string, string>;
        driver_names?: string[];
      };
      if (!title || !message) {
        res.status(400).json({ ok: false, error: "Missing title or message" });
        return;
      }
      if (!FCM_SERVER_KEY) {
        res.status(500).json({ ok: false, error: "FCM not configured" });
        return;
      }

      let tokens: string[] = [];
      if (supa && Array.isArray(driver_names) && driver_names.length > 0) {
        const { data: rows, error } = await supa
          .from("driver_push_tokens")
          .select("token, driver_name")
          .in("driver_name", driver_names);
        if (error) console.error("Token query error", error);
        tokens = (rows || []).map((r: any) => r.token).filter(Boolean);
      }

      // Fallback: allow direct tokens in payload
      if (!tokens.length && Array.isArray((req.body as any).tokens)) {
        tokens = (req.body as any).tokens.filter(
          (t: any) => typeof t === "string",
        );
      }

      if (!tokens.length) {
        res.status(404).json({ ok: false, error: "No tokens found" });
        return;
      }

      const result = await sendFcm(tokens, { title, body: message, data });

      // Optional: record notification row
      if (supa) {
        await supa.from("driver_notifications").insert({
          title,
          message,
          data: data ? JSON.stringify(data) : null,
          audience: Array.isArray(driver_names) ? driver_names.join(",") : null,
        } as any);
      }

      res.json({ ok: true, result });
    } catch (err: any) {
      console.error("/api/notify error", err);
      res
        .status(500)
        .json({ ok: false, error: err?.message || "Unknown error" });
    }
  });

  return app;
}
