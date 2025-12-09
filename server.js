import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";

const CSV_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let cachedCsvText = null;
let cachedCsvFetchedAt = 0;

// Lightweight in-memory store for posted fuel data (non-persistent)
const inMemoryFuelRecords = [];

app.use(express.static(join(__dirname, "dist")));
app.use(express.json());

async function fetchLatestCsv(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedCsvText && now - cachedCsvFetchedAt < CSV_CACHE_TTL_MS) {
    return { csvText: cachedCsvText, cached: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(CSV_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  cachedCsvText = csvText;
  cachedCsvFetchedAt = now;
  return { csvText, cached: false };
}

function normalizeFuelRecord(record) {
  return {
    sitename: record?.sitename?.trim() || "",
    region: record?.region?.trim() || "",
    refilled_date: record?.refilled_date?.trim() || "",
    refilled_quantity: Number(record?.refilled_quantity) || 0,
  };
}

function isValidFuelRecord(record) {
  if (!record.sitename || !record.refilled_date) return false;
  const dateValid = !Number.isNaN(Date.parse(record.refilled_date));
  return dateValid && record.refilled_quantity > 0;
}

function filterRecordsByDate(records, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return records.filter((record) => {
    const recordDate = new Date(record.refilled_date);
    return recordDate >= start && recordDate <= end;
  });
}

app.get("/api/fetch-csv", async (req, res) => {
  try {
    const { csvText, cached } = await fetchLatestCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-CSV-Cache", cached ? "HIT" : "MISS");
    res.send(csvText);
  } catch (error) {
    console.error("Server: Error fetching CSV:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/save-fuel-data", (req, res) => {
  const { records } = req.body || {};

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: "Invalid records format" });
  }

  const normalized = records.map(normalizeFuelRecord).filter(isValidFuelRecord);

  const existingMap = new Map(
    inMemoryFuelRecords.map((record) => [`${record.sitename}|${record.refilled_date}`, record]),
  );

  let inserted = 0;
  normalized.forEach((record) => {
    const key = `${record.sitename}|${record.refilled_date}`;
    if (!existingMap.has(key)) {
      inserted += 1;
      existingMap.set(key, record);
    } else {
      existingMap.set(key, record);
    }
  });

  inMemoryFuelRecords.length = 0;
  inMemoryFuelRecords.push(...existingMap.values());

  res.json({
    success: true,
    inserted,
    stored: inMemoryFuelRecords.length,
    totalReceived: records.length,
    valid: normalized.length,
  });
});

app.get("/api/get-invoice-data", (req, res) => {
  const { startDate, endDate, region } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: "Missing startDate or endDate",
      received: { startDate, endDate },
    });
  }

  let filteredData = filterRecordsByDate(inMemoryFuelRecords, startDate, endDate);

  if (region && region !== "All") {
    const target = region.toLowerCase();
    filteredData = filteredData.filter((record) => {
      const value = record.region.toLowerCase();
      if (target === "cer") {
        return value.includes("central") || value.includes("east");
      }
      return value.includes(target);
    });
  }

  res.json({
    success: true,
    records: filteredData.sort((a, b) => a.sitename.localeCompare(b.sitename)),
    count: filteredData.length,
    source: "memory",
  });
});

app.post("/api/sync-fuel-sheet", async (req, res) => {
  try {
    const { csvText } = await fetchLatestCsv(true);
    const rowCount = Math.max(csvText.trim().split("\n").length - 1, 0);

    res.json({
      status: "success",
      refreshed: true,
      rowsDetected: rowCount,
      cachedAt: new Date(cachedCsvFetchedAt).toISOString(),
    });
  } catch (error) {
    console.error("Server: Sync failed:", error.message);
    res.status(500).json({ status: "error", error: error.message });
  }
});

app.post("/api/cleanup-duplicates", (req, res) => {
  const dedupedMap = new Map();
  inMemoryFuelRecords.forEach((record) => {
    const key = `${record.sitename}|${record.refilled_date}`;
    dedupedMap.set(key, record);
  });

  const duplicatesRemoved = inMemoryFuelRecords.length - dedupedMap.size;
  inMemoryFuelRecords.length = 0;
  inMemoryFuelRecords.push(...dedupedMap.values());

  res.json({
    status: "success",
    duplicatesRemoved,
    remaining: inMemoryFuelRecords.length,
  });
});

function startScheduledSync() {
  const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  setInterval(async () => {
    try {
      await fetchLatestCsv(true);
      console.log("⏰ CSV cache refreshed");
    } catch (error) {
      console.warn("⚠️  Scheduled refresh failed:", error.message);
    }
  }, SYNC_INTERVAL_MS);
  console.log("⏰ Scheduled CSV refresh started (every 10 minutes)");
}

app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  startScheduledSync();
});
