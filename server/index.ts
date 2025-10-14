import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || "";

const supa = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : (null as any);

async function sendFcm(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
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
  if (!resp.ok) throw new Error(`FCM error ${resp.status}: ${JSON.stringify(json)}`);
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

  app.get("/api/demo", handleDemo);

  app.post("/api/password-reset", async (req, res) => {
    const { email } = req.body as { email?: string };
    console.log("Password reset requested for:", email);
    res.json({ ok: true });
  });

  app.post("/api/send-otp", async (req, res) => {
    try {
      const { to, name, code, expires_at } = req.body as {
        to?: string;
        name?: string;
        code?: string;
        expires_at?: string;
      };

      if (!to || !code) {
        res.status(400).json({ ok: false, error: "Missing 'to' or 'code'" });
        return;
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
      const authToken = process.env.TWILIO_AUTH_TOKEN || "";
      const from = process.env.TWILIO_WHATSAPP_FROM || ""; // e.g. whatsapp:+14155238886
      const contentSid = process.env.TWILIO_CONTENT_SID || ""; // Optional approved template content SID

      if (!accountSid || !authToken || !from) {
        res.status(500).json({ ok: false, error: "Twilio not configured" });
        return;
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const params = new URLSearchParams();
      params.append("To", to.startsWith("whatsapp:") ? to : `whatsapp:${to}`);
      params.append("From", from);

      if (contentSid) {
        params.append("ContentSid", contentSid);
        const vars = {
          1: code,
          2: new Date(expires_at || Date.now()).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
        } as Record<string, string>;
        params.append("ContentVariables", JSON.stringify(vars));
      } else {
        const minutes = Math.max(
          1,
          Math.round((Date.parse(expires_at || "") - Date.now()) / 60000)
        );
        const body = `Your ACES MSD Fuel OTP is ${code}. It expires in ${Number.isFinite(minutes) ? minutes : 5} minutes.`;
        params.append("Body", body);
      }

      const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params as any,
      });

      if (!resp.ok) {
        const text = await resp.text();
        res.status(500).json({ ok: false, error: "Twilio API error", details: text });
        return;
      }

      const data = await resp.json();
      res.json({ ok: true, sid: data.sid });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
    }
  });

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
        tokens = (req.body as any).tokens.filter((t: any) => typeof t === "string");
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
      res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
    }
  });

  return app;
}
