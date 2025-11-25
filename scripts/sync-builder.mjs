import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const API_KEY = process.env.BUILDER_API_KEY;
const MODEL = process.env.BUILDER_MODEL || "page";
const OUTPUT_DIR = process.env.BUILDER_OUTPUT_DIR || "client/builder";

async function main() {
  if (!API_KEY) {
    console.error("Missing BUILDER_API_KEY env var. Set it and re-run.");
    process.exit(1);
  }

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const url = `https://cdn.builder.io/api/v3/content/${encodeURIComponent(
    MODEL,
  )}?apiKey=${encodeURIComponent(API_KEY)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Builder fetch failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  if (!results.length) {
    console.error("No content found in Builder.io");
    return;
  }

  for (const item of results) {
    const raw = String(item?.name || item?.id || "content");
    const file = raw.trim().replace(/\s+/g, "-").toLowerCase();
    const path = `${OUTPUT_DIR}/${file}.json`;
    await writeFile(path, JSON.stringify(item, null, 2));
    console.log(`✅ Synced: ${raw}`);
  }

  console.log("Done. Review changes and Push Code when ready.");
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
