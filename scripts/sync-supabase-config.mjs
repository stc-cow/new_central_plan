#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const envPath = resolve(root, ".env");
dotenv.config({ path: envPath });

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) in .env",
  );
  process.exit(1);
}

const publicDir = resolve(root, "public");
mkdirSync(publicDir, { recursive: true });
const envJsPath = join(publicDir, "env.js");
const pushEnabled =
  process.env.VITE_PUSH_NOTIFICATIONS_ENABLED ||
  process.env.PUSH_NOTIFICATIONS_ENABLED ||
  "";

const runtimeEntries = {
  VITE_SUPABASE_URL: SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
};
if (pushEnabled) {
  runtimeEntries.VITE_PUSH_NOTIFICATIONS_ENABLED = pushEnabled;
}

const runtimePairs = Object.entries(runtimeEntries)
  .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
  .join(",\n");

const envJs = `window.__env = Object.assign(window.__env || {}, {\n${runtimePairs}\n});\n`;
writeFileSync(envJsPath, envJs, "utf8");
console.log(`Updated ${envJsPath}`);

const resourcesDir = resolve(root, "Resources");
mkdirSync(resourcesDir, { recursive: true });
const plistPath = join(resourcesDir, "SupabaseConfig.plist");
const examplePath = join(resourcesDir, "SupabaseConfig.example.plist");
let plistTemplate;
try {
  plistTemplate = readFileSync(examplePath, "utf8");
} catch (error) {
  plistTemplate = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n    <key>url</key>\n    <string>${SUPABASE_URL}</string>\n    <key>anonKey</key>\n    <string>${SUPABASE_ANON_KEY}</string>\n</dict>\n</plist>\n`;
}
const plist = plistTemplate
  .replace(/<string>https:\/\/[^<]+<\/string>/, `<string>${SUPABASE_URL}</string>`)
  .replace(/<string>YOUR_SUPABASE_ANON_KEY<\/string>/, `<string>${SUPABASE_ANON_KEY}</string>`);
writeFileSync(plistPath, plist, "utf8");
console.log(`Updated ${plistPath}`);
