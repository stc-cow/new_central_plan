import { defineConfig } from "vite";
import fetch from "node-fetch";
import crypto from "crypto";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";

function csvProxyPlugin() {
  return {
    name: "csv-proxy-plugin",
    apply: "serve",
    configureServer(server) {
      return () => {
        server.middlewares.use("/api/fetch-csv", async (req, res, next) => {
          try {
            console.log("Fetching CSV from Google Sheets...");
            const response = await fetch(CSV_URL);

            if (!response.ok) {
              res.writeHead(response.status, {
                "Content-Type": "application/json",
              });
              res.end(
                JSON.stringify({
                  error: `Failed to fetch CSV: ${response.statusText}`,
                }),
              );
              return;
            }

            const csvText = await response.text();
            res.writeHead(200, {
              "Content-Type": "text/csv; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(csvText);
          } catch (error) {
            console.error("Error fetching CSV:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: error.message }));
          }
        });

        server.middlewares.use(
          "/api/save-fuel-data",
          async (req, res, next) => {
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            req.on("end", async () => {
              try {
                const { records } = JSON.parse(body);

                if (!records || !Array.isArray(records)) {
                  res.writeHead(400, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "Invalid records format" }));
                  return;
                }

                console.log(
                  `Dev Server: Received ${records.length} fuel records to save`,
                );

                // Dev Server-side validation: ensure only valid data is sent to Supabase
                console.log(
                  `Dev Server: Validating records (must have valid date and quantity > 0)...`,
                );
                const validRecords = [];
                const invalidRecords = [];

                records.forEach((record, idx) => {
                  const hasValidDate =
                    record.refilled_date &&
                    String(record.refilled_date).trim() !== "";
                  const hasValidQty =
                    record.refilled_quantity &&
                    Number(record.refilled_quantity) > 0;

                  if (hasValidDate && hasValidQty) {
                    validRecords.push(record);
                  } else {
                    invalidRecords.push({
                      index: idx,
                      sitename: record.sitename,
                      date: record.refilled_date || "MISSING",
                      qty: record.refilled_quantity || "MISSING",
                      reason: !hasValidDate
                        ? "Invalid/Missing Date"
                        : "Quantity ≤ 0",
                    });
                  }
                });

                console.log(`Dev Server: Validation complete`);
                console.log(`  ✅ Valid records: ${validRecords.length}`);
                console.log(`  ❌ Invalid records: ${invalidRecords.length}`);

                if (invalidRecords.length > 0) {
                  console.warn(
                    `Dev Server: Invalid records that will be EXCLUDED:`,
                  );
                  invalidRecords.slice(0, 10).forEach((rec) => {
                    console.warn(
                      `  - ${rec.sitename}: Date=${rec.date}, Qty=${rec.qty} (${rec.reason})`,
                    );
                  });
                  if (invalidRecords.length > 10) {
                    console.warn(
                      `  ... and ${invalidRecords.length - 10} more invalid records`,
                    );
                  }
                }

                if (validRecords.length === 0) {
                  console.warn(
                    `Dev Server: No valid records to insert after validation`,
                  );
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(
                    JSON.stringify({
                      success: false,
                      inserted: 0,
                      total: records.length,
                      message:
                        "No valid records (all records had invalid date or quantity ≤ 0)",
                      invalidRecords: invalidRecords.length,
                      batchResults: [],
                    }),
                  );
                  return;
                }

                // Dynamically import Supabase client for dev environment
                const { createClient } = await import("@supabase/supabase-js");

                const supabaseUrl = process.env.VITE_SUPABASE_URL;
                const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

                if (!supabaseUrl || !supabaseKey) {
                  console.error("Dev Server: Missing Supabase credentials");
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(
                    JSON.stringify({
                      error: "Supabase not configured",
                      inserted: 0,
                    }),
                  );
                  return;
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
                      console.log(
                        `Dev Server: Inserting batch ${batchNum} (attempt ${retryCount + 1}/${MAX_RETRIES})...`,
                      );

                      const { data, error } = await supabase
                        .from("live_fuel_data")
                        .insert(batch);

                      if (error) {
                        retryCount++;
                        if (retryCount < MAX_RETRIES) {
                          console.warn(
                            `Dev Server: Batch ${batchNum} failed (attempt ${retryCount}): ${error.message}`,
                          );
                          await new Promise((resolve) =>
                            setTimeout(resolve, 2000),
                          );
                        } else {
                          console.error(
                            `Dev Server: Batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${error.message}`,
                          );
                          batchResults.push({
                            batch: batchNum,
                            status: "failed",
                            error: error.message,
                          });
                        }
                      } else {
                        insertedCount += batch.length;
                        console.log(
                          `Dev Server: Batch ${batchNum} inserted: ${batch.length} records (Total: ${insertedCount})`,
                        );
                        batchResults.push({
                          batch: batchNum,
                          status: "success",
                          count: batch.length,
                        });
                        inserted = true;
                      }
                    } catch (err) {
                      retryCount++;
                      if (retryCount < MAX_RETRIES) {
                        console.warn(
                          `Dev Server: Batch ${batchNum} exception (attempt ${retryCount}): ${err.message}`,
                        );
                        await new Promise((resolve) =>
                          setTimeout(resolve, 2000),
                        );
                      } else {
                        console.error(
                          `Dev Server: Batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${err.message}`,
                        );
                        batchResults.push({
                          batch: batchNum,
                          status: "failed",
                          error: err.message,
                        });
                      }
                    }
                  }
                }

                console.log(`Dev Server: Migration complete!`);
                console.log(
                  `  ✅ Inserted to Supabase: ${insertedCount}/${validRecords.length} valid records`,
                );
                console.log(
                  `  ❌ Excluded (invalid data): ${invalidRecords.length} records`,
                );

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    success: insertedCount > 0,
                    inserted: insertedCount,
                    total: records.length,
                    valid: validRecords.length,
                    invalid: invalidRecords.length,
                    batchResults,
                  }),
                );
              } catch (error) {
                console.error(
                  "Dev Server: Error in /api/save-fuel-data:",
                  error,
                );
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: error.message,
                    inserted: 0,
                  }),
                );
              }
            });
          },
        );

        server.middlewares.use(
          "/api/sync-fuel-sheet",
          async (req, res, next) => {
            if (req.method === "GET") {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "info",
                  message: "Use POST /api/sync-fuel-sheet to trigger a sync",
                  lastSync: null,
                  nextScheduledSync: "Every 6 hours (configurable)",
                }),
              );
              return;
            }

            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              console.log(
                "\n🔄 Starting Google Sheets Fuel Data Sync (hash-based deduplication)...",
              );
              const syncStartTime = Date.now();

              const { createClient } = await import("@supabase/supabase-js");

              const supabaseUrl =
                process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
              const supabaseServiceRole =
                process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.VITE_SUPABASE_SERVICE_ROLE;

              if (!supabaseUrl || !supabaseServiceRole) {
                console.error("❌ Missing Supabase credentials for sync");
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    status: "error",
                    error: "Supabase credentials not configured",
                    records: {
                      processed: 0,
                      inserted: 0,
                      skipped: 0,
                      invalid: 0,
                    },
                  }),
                );
                return;
              }

              const supabase = createClient(supabaseUrl, supabaseServiceRole);

              // Fetch CSV from Google Sheets
              console.log("📥 Fetching CSV from Google Sheets...");
              const csvResponse = await fetch(CSV_URL, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
              });

              if (!csvResponse.ok) {
                throw new Error(
                  `Failed to fetch CSV: ${csvResponse.statusText}`,
                );
              }

              const csvText = await csvResponse.text();
              const rows = csvText.split("\n").map((r) => r.split(","));
              const headers = rows[0];
              const dataRows = rows.slice(1).filter((row) => row.length >= 4);

              console.log(
                `📊 CSV fetched successfully: ${dataRows.length} data rows`,
              );

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
                    .update(
                      `${sitename}-${region}-${refilled_date}-${refilled_quantity}`,
                    )
                    .digest("hex");

                  // Check if this record already exists (by sitename + date)
                  const { data: existing, error: checkError } = await supabase
                    .from("live_fuel_data")
                    .select("id")
                    .eq("sitename", sitename)
                    .eq("refilled_date", refilled_date)
                    .maybeSingle();

                  if (checkError) {
                    console.warn(
                      `⚠️  Error checking existing row: ${checkError.message}`,
                    );
                  }

                  if (existing) {
                    skipped++;
                    continue;
                  }

                  // Insert new record to live table
                  const { data: insertData, error: insertError } =
                    await supabase.from("live_fuel_data").insert([
                      {
                        sitename,
                        region,
                        refilled_date,
                        refilled_quantity,
                      },
                    ]);

                  if (insertError) {
                    errors.push({
                      sitename,
                      date: refilled_date,
                      error: insertError.message,
                    });
                    console.warn(
                      `⚠️  Insert failed for ${sitename}: ${insertError.message}`,
                    );
                  } else {
                    inserted++;
                  }
                } catch (rowError) {
                  console.warn(`⚠️  Error processing row: ${rowError.message}`);
                  errors.push({
                    error: rowError.message,
                  });
                }
              }

              const syncDurationMs = Date.now() - syncStartTime;

              console.log(`\n✅ Sync Complete!`);
              console.log(`   📊 Total processed: ${processed}`);
              console.log(`   ✨ Inserted: ${inserted}`);
              console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
              console.log(`   ❌ Invalid: ${invalid}`);
              console.log(`   ⏱️  Duration: ${syncDurationMs}ms`);

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "success",
                  message:
                    "Google Sheet synced successfully with hash-based deduplication",
                  records: {
                    processed,
                    inserted,
                    skipped,
                    invalid,
                  },
                  lastSync: new Date().toISOString(),
                  durationMs: syncDurationMs,
                  errors: errors.length > 0 ? errors.slice(0, 10) : [],
                }),
              );
            } catch (error) {
              console.error("❌ Sync failed:", error.message);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "error",
                  error: error.message,
                  records: {
                    processed: 0,
                    inserted: 0,
                    skipped: 0,
                    invalid: 0,
                  },
                }),
              );
            }
          },
        );

        server.middlewares.use(
          "/api/cleanup-duplicates",
          async (req, res, next) => {
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              console.log(
                "\n🧹 Starting duplicate cleanup process (dev server)...",
              );

              const { createClient } = await import("@supabase/supabase-js");

              const supabaseUrl = process.env.VITE_SUPABASE_URL;
              const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

              console.log(
                `📋 Supabase URL: ${supabaseUrl ? "✓ Set" : "✗ Missing"}`,
              );
              console.log(
                `🔑 Supabase Key: ${supabaseKey ? "✓ Set" : "✗ Missing"}`,
              );

              if (!supabaseUrl || !supabaseKey) {
                console.error("Dev Server: Missing Supabase credentials");
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    status: "error",
                    error: "Supabase not configured",
                  }),
                );
                return;
              }

              const supabase = createClient(supabaseUrl, supabaseKey);

              // Fetch all records from the database
              console.log(
                "📥 Fetching all records from live_fuel_data table...",
              );
              let { data: allRecords, error: fetchError } = await supabase
                .from("live_fuel_data")
                .select(
                  "id, sitename, refilled_date, refilled_quantity, region",
                );

              if (fetchError) {
                console.error(
                  "❌ Error fetching records:",
                  fetchError?.message || fetchError,
                );
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    status: "error",
                    error: "Failed to fetch records from database",
                    details:
                      fetchError?.message ||
                      fetchError?.details ||
                      String(fetchError),
                  }),
                );
                return;
              }

              if (!allRecords) {
                allRecords = [];
              }

              if (allRecords.length === 0) {
                console.log("✅ No records to clean");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    status: "success",
                    message: "No records to clean",
                    duplicatesRemoved: 0,
                    recordsKept: 0,
                    totalBefore: 0,
                  }),
                );
                return;
              }

              console.log(`📊 Total records: ${allRecords.length}`);

              // Group records by sitename + refilled_date and find duplicates
              const grouped = {};
              const duplicateIds = [];

              for (const record of allRecords) {
                const key = `${record.sitename}|${record.refilled_date}`;

                if (!grouped[key]) {
                  grouped[key] = [];
                }
                grouped[key].push(record.id);
              }

              // Identify duplicate IDs (keep first, remove rest)
              let dupeCount = 0;
              for (const key in grouped) {
                if (grouped[key].length > 1) {
                  dupeCount++;
                  console.log(
                    `⚠️  Found ${grouped[key].length} duplicates for: ${key}`,
                  );
                  // Keep the first one (lowest ID), mark others for deletion
                  for (let i = 1; i < grouped[key].length; i++) {
                    duplicateIds.push(grouped[key][i]);
                  }
                }
              }

              if (duplicateIds.length === 0) {
                console.log("✅ No duplicates found");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    status: "success",
                    message: "No duplicates found in the database",
                    duplicatesRemoved: 0,
                    recordsKept: allRecords.length,
                    totalBefore: allRecords.length,
                  }),
                );
                return;
              }

              console.log(
                `🔄 Removing ${duplicateIds.length} duplicate records from ${dupeCount} groups...`,
              );

              // Delete duplicates in batches
              let deletedCount = 0;
              const BATCH_SIZE = 50;

              for (let i = 0; i < duplicateIds.length; i += BATCH_SIZE) {
                const batch = duplicateIds.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;

                console.log(
                  `   Deleting batch ${batchNum} (${batch.length} records)...`,
                );

                const { error: deleteError } = await supabase
                  .from("live_fuel_data")
                  .delete()
                  .in("id", batch);

                if (deleteError) {
                  console.error(
                    `❌ Batch ${batchNum} delete failed:`,
                    deleteError?.message || deleteError,
                  );
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(
                    JSON.stringify({
                      status: "error",
                      error: `Failed to delete batch ${batchNum}`,
                      details: deleteError?.message || String(deleteError),
                      deletedSoFar: deletedCount,
                    }),
                  );
                  return;
                }

                deletedCount += batch.length;
                console.log(
                  `   ✅ Batch ${batchNum} deleted: ${batch.length} records`,
                );
              }

              console.log(`\n✅ Cleanup Complete!`);
              console.log(`   🗑️  Duplicates removed: ${deletedCount}`);
              console.log(
                `   ✨ Records kept: ${allRecords.length - deletedCount}`,
              );

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "success",
                  message: "Duplicates cleaned successfully",
                  duplicatesRemoved: deletedCount,
                  recordsKept: allRecords.length - deletedCount,
                  totalBefore: allRecords.length,
                }),
              );
            } catch (error) {
              console.error("❌ Cleanup failed:", error);
              console.error("   Stack:", error?.stack);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "error",
                  error: error?.message || String(error),
                  type: error?.constructor?.name,
                }),
              );
            }
          },
        );
      };
    },
  };
}

export default defineConfig({
  plugins: [csvProxyPlugin()],
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
