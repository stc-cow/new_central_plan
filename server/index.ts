import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

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
        const vars = { 1: code, 2: new Date(expires_at || Date.now()).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) } as Record<string, string>;
        params.append("ContentVariables", JSON.stringify(vars));
      } else {
        const minutes = Math.max(1, Math.round((Date.parse(expires_at || "") - Date.now()) / 60000));
        const body = `Your ACES MSD Fuel OTP is ${code}. It expires in ${Number.isFinite(minutes) ? minutes : 5} minutes.`;
        params.append("Body", body);
      }

      const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
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

  return app;
}
