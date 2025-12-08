import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";

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

app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
