import { defineConfig } from "vite";
import fetch from "node-fetch";

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

        server.middlewares.use("/api/save-fuel-data", async (req, res, next) => {
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

              console.log(`Dev Server: Received ${records.length} fuel records to save`);

              // Dev Server-side validation: ensure only valid data is sent to Supabase
              console.log(`Dev Server: Validating records (must have valid date and quantity > 0)...`);
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

              console.log(`Dev Server: Validation complete`);
              console.log(`  ✅ Valid records: ${validRecords.length}`);
              console.log(`  ❌ Invalid records: ${invalidRecords.length}`);

              if (invalidRecords.length > 0) {
                console.warn(`Dev Server: Invalid records that will be EXCLUDED:`);
                invalidRecords.slice(0, 10).forEach(rec => {
                  console.warn(`  - ${rec.sitename}: Date=${rec.date}, Qty=${rec.qty} (${rec.reason})`);
                });
                if (invalidRecords.length > 10) {
                  console.warn(`  ... and ${invalidRecords.length - 10} more invalid records`);
                }
              }

              if (validRecords.length === 0) {
                console.warn(`Dev Server: No valid records to insert after validation`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  success: false,
                  inserted: 0,
                  total: records.length,
                  message: "No valid records (all records had invalid date or quantity ≤ 0)",
                  invalidRecords: invalidRecords.length,
                  batchResults: []
                }));
                return;
              }

              // Dynamically import Supabase client for dev environment
              const { createClient } = await import("@supabase/supabase-js");

              const supabaseUrl = process.env.VITE_SUPABASE_URL;
              const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

              if (!supabaseUrl || !supabaseKey) {
                console.error("Dev Server: Missing Supabase credentials");
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  error: "Supabase not configured",
                  inserted: 0
                }));
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
                    console.log(`Dev Server: Inserting batch ${batchNum} (attempt ${retryCount + 1}/${MAX_RETRIES})...`);

                    const { data, error } = await supabase
                      .from("fuel_quantities")
                      .insert(batch);

                    if (error) {
                      retryCount++;
                      if (retryCount < MAX_RETRIES) {
                        console.warn(`Dev Server: Batch ${batchNum} failed (attempt ${retryCount}): ${error.message}`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                      } else {
                        console.error(`Dev Server: Batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${error.message}`);
                        batchResults.push({
                          batch: batchNum,
                          status: "failed",
                          error: error.message
                        });
                      }
                    } else {
                      insertedCount += batch.length;
                      console.log(`Dev Server: Batch ${batchNum} inserted: ${batch.length} records (Total: ${insertedCount})`);
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
                      console.warn(`Dev Server: Batch ${batchNum} exception (attempt ${retryCount}): ${err.message}`);
                      await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                      console.error(`Dev Server: Batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${err.message}`);
                      batchResults.push({
                        batch: batchNum,
                        status: "failed",
                        error: err.message
                      });
                    }
                  }
                }
              }

              console.log(`Dev Server: Migration complete! Inserted ${insertedCount}/${records.length} records`);

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                success: insertedCount > 0,
                inserted: insertedCount,
                total: records.length,
                batchResults
              }));
            } catch (error) {
              console.error("Dev Server: Error in /api/save-fuel-data:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: error.message,
                inserted: 0
              }));
            }
          });
        });
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
