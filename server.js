import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";

// Global state for scheduled sync
let syncScheduleIntervalId = null;
let lastSyncTime = null;

app.use(express.static(join(__dirname, "dist")));

app.use(express.json());

app.get("/api/fetch-csv", async (req, res) => {
  try {
    console.log("Server: Fetching CSV from Google Sheets...");

    const response = await fetch(CSV_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch CSV: ${response.status} ${response.statusText}`,
      );
      return res
        .status(response.status)
        .json({ error: `Failed to fetch CSV: ${response.statusText}` });
    }

    const csvText = await response.text();
    console.log(`Server: Successfully fetched CSV, length: ${csvText.length}`);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvText);
  } catch (error) {
    console.error("Server: Error fetching CSV:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/save-fuel-data", async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: "Invalid records format" });
    }

    console.log(`Server: Received ${records.length} fuel records to save`);

    // Server-side validation: ensure only valid data is sent to Supabase
    console.log(`Server: Validating records (must have valid date and quantity > 0)...`);
    const validRecords = [];
    const invalidRecords = [];

    records.forEach((record, idx) => {
      const hasValidDate = record.refilled_date && String(record.refilled_date).trim() !== '';
      const hasValidQty = record.refilled_quantity && Number(record.refilled_quantity) > 0;

      if (hasValidDate && hasValidQty) {
        validRecords.push(record);
      } else {
        invalidRecords.push({
          index: idx,
          sitename: record.sitename,
          date: record.refilled_date || 'MISSING',
          qty: record.refilled_quantity || 'MISSING',
          reason: !hasValidDate ? 'Invalid/Missing Date' : 'Quantity ≤ 0'
        });
      }
    });

    console.log(`Server: Validation complete`);
    console.log(`  ✅ Valid records: ${validRecords.length}`);
    console.log(`  ❌ Invalid records: ${invalidRecords.length}`);

    if (invalidRecords.length > 0) {
      console.warn(`Server: Invalid records that will be EXCLUDED:`);
      invalidRecords.slice(0, 10).forEach(rec => {
        console.warn(`  - ${rec.sitename}: Date=${rec.date}, Qty=${rec.qty} (${rec.reason})`);
      });
      if (invalidRecords.length > 10) {
        console.warn(`  ... and ${invalidRecords.length - 10} more invalid records`);
      }
    }

    if (validRecords.length === 0) {
      console.warn(`Server: No valid records to insert after validation`);
      return res.json({
        success: false,
        inserted: 0,
        total: records.length,
        message: "No valid records (all records had invalid date or quantity ≤ 0)",
        invalidRecords: invalidRecords.length,
        batchResults: []
      });
    }

    // Import Supabase client
    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Server: Missing Supabase credentials");
      return res.status(500).json({
        error: "Supabase not configured on server",
        inserted: 0
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const BATCH_SIZE = 50;
    let insertedCount = 0;
    const MAX_RETRIES = 3;
    const batchResults = [];

    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      let inserted = false;
      let retryCount = 0;

      while (!inserted && retryCount < MAX_RETRIES) {
        try {
          console.log(`Server: Inserting batch ${batchNum} (attempt ${retryCount + 1}/${MAX_RETRIES})...`);

          const { data, error } = await supabase
            .from("fuel_quantities")
            .insert(batch);

          if (error) {
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              console.warn(`Server: Batch ${batchNum} failed (attempt ${retryCount}): ${error.message}`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.error(`Server: Batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${error.message}`);
              batchResults.push({
                batch: batchNum,
                status: "failed",
                error: error.message
              });
            }
          } else {
            insertedCount += batch.length;
            console.log(`Server: Batch ${batchNum} inserted: ${batch.length} records (Total: ${insertedCount})`);
            batchResults.push({
              batch: batchNum,
              status: "success",
              count: batch.length
            });
            inserted = true;
          }
        } catch (err) {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            console.warn(`Server: Batch ${batchNum} exception (attempt ${retryCount}): ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.error(`Server: Batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${err.message}`);
            batchResults.push({
              batch: batchNum,
              status: "failed",
              error: err.message
            });
          }
        }
      }
    }

    console.log(`Server: Migration complete!`);
    console.log(`  ✅ Inserted to Supabase: ${insertedCount}/${validRecords.length} valid records`);
    console.log(`  ❌ Excluded (invalid data): ${invalidRecords.length} records`);

    return res.json({
      success: insertedCount > 0,
      inserted: insertedCount,
      total: records.length,
      valid: validRecords.length,
      invalid: invalidRecords.length,
      batchResults
    });
  } catch (error) {
    console.error("Server: Error in /api/save-fuel-data:", error.message);
    return res.status(500).json({
      error: error.message,
      inserted: 0
    });
  }
});

app.get("/api/get-invoice-data", async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing startDate or endDate",
        received: { startDate, endDate }
      });
    }

    console.log(`\n📋 Invoice API: Fetching records from database...`);
    console.log(`   Date range: ${startDate} to ${endDate}`);
    console.log(`   Region filter: ${region || 'All'}`);

    const { createClient } = await import("@supabase/supabase-js");

    // Use new Supabase project with deduplication, fallback to old if not available
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Server: Missing Supabase credentials");
      return res.status(500).json({ error: "Supabase not configured on server" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read all records from database table
    const { data, error } = await supabase
      .from("fuel_quantities")
      .select("sitename, region, refilled_date, refilled_quantity")
      .gte("refilled_date", startDate)
      .lte("refilled_date", endDate);

    if (error) {
      console.error("❌ Database query error:", error.message);
      return res.status(500).json({
        error: "Failed to fetch invoice data from database",
        details: error.message
      });
    }

    if (!data) {
      console.warn("⚠️  Database returned no data");
      return res.json({ records: [] });
    }

    console.log(`✅ Fetched ${data.length} records from database (within date range)`);

    // Apply region filter if specified
    let filteredData = data;
    if (region && region.trim() !== "" && region !== "All") {
      filteredData = data.filter((record) => {
        if (region === "CER") {
          return record.region?.toLowerCase().includes("central") ||
                 record.region?.toLowerCase().includes("east");
        } else if (region === "Central") {
          return record.region?.toLowerCase().includes("central");
        } else if (region === "East") {
          return record.region?.toLowerCase().includes("east");
        }
        return true;
      });
      console.log(`✅ After region filter (${region}): ${filteredData.length} records`);
    }

    console.log(`📊 Sample records:`);
    filteredData.slice(0, 5).forEach((record, idx) => {
      console.log(`  [${idx + 1}] ${record.sitename} | ${record.refilled_date} | Qty: ${record.refilled_quantity}`);
    });

    res.json({
      success: true,
      records: filteredData,
      count: filteredData.length,
      total: data.length,
      filtered: data.length - filteredData.length
    });
  } catch (error) {
    console.error("❌ Error in /api/get-invoice-data:", error.message);
    res.status(500).json({
      error: error.message,
      records: []
    });
  }
});

app.post("/api/sync-fuel-sheet", async (req, res) => {
  try {
    console.log("\n🔄 Starting Google Sheets Fuel Data Sync (hash-based deduplication)...");
    const syncStartTime = Date.now();

    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceRole) {
      console.error("❌ Missing Supabase credentials for sync");
      return res.status(500).json({
        status: "error",
        error: "Supabase credentials not configured",
        records: { processed: 0, inserted: 0, skipped: 0, invalid: 0 }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Fetch CSV from Google Sheets
    console.log("📥 Fetching CSV from Google Sheets...");
    const csvResponse = await fetch(CSV_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV: ${csvResponse.statusText}`);
    }

    const csvText = await csvResponse.text();
    const rows = csvText.split("\n").map(r => r.split(","));
    const headers = rows[0];
    const dataRows = rows.slice(1).filter(row => row.length >= 4);

    console.log(`📊 CSV fetched successfully: ${dataRows.length} data rows`);

    let processed = 0;
    let inserted = 0;
    let skipped = 0;
    let invalid = 0;
    const errors = [];

    for (const row of dataRows) {
      try {
        const sitename = row[0]?.trim();
        const region = row[1]?.trim() || null;
        const refilled_date = row[2]?.trim();
        const refilled_quantity = parseFloat(row[3]?.trim());

        processed++;

        // Validation: skip invalid records
        if (!refilled_quantity || refilled_quantity <= 0) {
          invalid++;
          continue;
        }

        if (isNaN(Date.parse(refilled_date))) {
          invalid++;
          continue;
        }

        if (!sitename) {
          invalid++;
          continue;
        }

        // Create hash for deduplication
        const row_hash = crypto
          .createHash("sha256")
          .update(`${sitename}-${region}-${refilled_date}-${refilled_quantity}`)
          .digest("hex");

        // Check if this row already exists (using unique constraint)
        const { data: existing, error: checkError } = await supabase
          .from("fuel_quantities")
          .select("id")
          .eq("row_hash", row_hash)
          .maybeSingle();

        if (checkError) {
          console.warn(`⚠️  Error checking existing row: ${checkError.message}`);
        }

        if (existing) {
          skipped++;
          continue;
        }

        // Insert new record with row_hash
        const { data: insertData, error: insertError } = await supabase
          .from("fuel_quantities")
          .insert([{
            sitename,
            region,
            refilled_date,
            refilled_quantity,
            row_hash
          }]);

        if (insertError) {
          errors.push({
            sitename,
            date: refilled_date,
            error: insertError.message
          });
          console.warn(`⚠️  Insert failed for ${sitename}: ${insertError.message}`);
        } else {
          inserted++;
        }
      } catch (rowError) {
        console.warn(`⚠️  Error processing row: ${rowError.message}`);
        errors.push({
          error: rowError.message
        });
      }
    }

    lastSyncTime = new Date().toISOString();
    const syncDurationMs = Date.now() - syncStartTime;

    console.log(`\n✅ Sync Complete!`);
    console.log(`   📊 Total processed: ${processed}`);
    console.log(`   ✨ Inserted: ${inserted}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
    console.log(`   ❌ Invalid: ${invalid}`);
    console.log(`   ⏱️  Duration: ${syncDurationMs}ms`);

    res.json({
      status: "success",
      message: "Google Sheet synced successfully with hash-based deduplication",
      records: {
        processed,
        inserted,
        skipped,
        invalid
      },
      lastSync: lastSyncTime,
      durationMs: syncDurationMs,
      errors: errors.length > 0 ? errors.slice(0, 10) : []
    });
  } catch (error) {
    console.error("❌ Sync failed:", error.message);
    res.status(500).json({
      status: "error",
      error: error.message,
      records: { processed: 0, inserted: 0, skipped: 0, invalid: 0 }
    });
  }
});

app.get("/api/sync-fuel-sheet", async (req, res) => {
  res.json({
    status: "info",
    message: "Use POST /api/sync-fuel-sheet to trigger a sync",
    lastSync: lastSyncTime,
    nextScheduledSync: "Every 6 hours (configurable)"
  });
});

// Schedule automatic syncs every 6 hours
function startScheduledSync() {
  const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  syncScheduleIntervalId = setInterval(async () => {
    console.log("\n⏰ Scheduled sync triggered...");
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE;

      if (!supabaseUrl || !supabaseServiceRole) {
        console.warn("⚠️  Scheduled sync skipped: missing Supabase credentials");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseServiceRole);
      const csvResponse = await fetch(CSV_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });

      if (!csvResponse.ok) {
        throw new Error(`CSV fetch failed: ${csvResponse.statusText}`);
      }

      const csvText = await csvResponse.text();
      const rows = csvText.split("\n").map(r => r.split(","));
      const dataRows = rows.slice(1).filter(row => row.length >= 4);

      let syncInserted = 0;
      let syncSkipped = 0;

      for (const row of dataRows) {
        try {
          const sitename = row[0]?.trim();
          const region = row[1]?.trim() || null;
          const refilled_date = row[2]?.trim();
          const refilled_quantity = parseFloat(row[3]?.trim());

          if (!refilled_quantity || refilled_quantity <= 0 || isNaN(Date.parse(refilled_date)) || !sitename) {
            continue;
          }

          const row_hash = crypto
            .createHash("sha256")
            .update(`${sitename}-${region}-${refilled_date}-${refilled_quantity}`)
            .digest("hex");

          const { data: existing } = await supabase
            .from("fuel_quantities")
            .select("id")
            .eq("row_hash", row_hash)
            .maybeSingle();

          if (existing) {
            syncSkipped++;
            continue;
          }

          const { error: insertError } = await supabase
            .from("fuel_quantities")
            .insert([{ sitename, region, refilled_date, refilled_quantity, row_hash }]);

          if (!insertError) {
            syncInserted++;
          }
        } catch (err) {
          // Continue processing other rows
        }
      }

      lastSyncTime = new Date().toISOString();
      console.log(`✅ Scheduled sync complete: Inserted ${syncInserted}, Skipped ${syncSkipped}`);
    } catch (error) {
      console.error("❌ Scheduled sync failed:", error.message);
    }
  }, SYNC_INTERVAL_MS);

  console.log("⏰ Scheduled sync started (every 6 hours)");
}

app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  startScheduledSync();
});
