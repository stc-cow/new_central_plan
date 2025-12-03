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

app.get("/api/fetch-csv", async (req, res) => {
  try {
    console.log("Server: Fetching CSV from Google Sheets...");

    const response = await fetch(CSV_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
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

app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
