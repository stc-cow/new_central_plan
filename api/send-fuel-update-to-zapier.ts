import { VercelRequest, VercelResponse } from "@vercel/node";

const GOOGLE_SHEETS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";
const ZAPIER_WEBHOOK_URL =
  "https://hooks.zapier.com/hooks/catch/24787962/ukrraio/";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const csvResponse = await fetch(GOOGLE_SHEETS_CSV_URL);
    const csvText = await csvResponse.text();

    const lines = csvText.split("\n").filter((line) => line.trim().length > 0);
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const idxSite = header.indexOf("sitename");
    const idxLat = header.indexOf("lat");
    const idxLng = header.indexOf("lng");
    const idxFuel = header.indexOf("nextfuelingplan");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayList: Record<string, unknown>[] = [];
    let dueList: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());

      const site = cols[idxSite];
      const fuelDateStr = cols[idxFuel];
      const lat = cols[idxLat];
      const lng = cols[idxLng];

      if (!fuelDateStr || !site || fuelDateStr === "") continue;

      const fuelDate = new Date(fuelDateStr);
      fuelDate.setHours(0, 0, 0, 0);

      if (isNaN(fuelDate.getTime())) continue;

      if (fuelDate.getTime() === today.getTime()) {
        todayList.push({
          site,
          date: fuelDateStr,
          lat: lat || null,
          lng: lng || null,
        });
      } else if (fuelDate < today) {
        dueList.push({
          site,
          date: fuelDateStr,
          lat: lat || null,
          lng: lng || null,
        });
      }
    }

    const payload = {
      today: todayList,
      due: dueList,
      timestamp: new Date().toISOString(),
      totalToday: todayList.length,
      totalDue: dueList.length,
    };

    const zapResponse = await fetch(ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(
      `✓ Zapier webhook sent: ${todayList.length} today, ${dueList.length} due. Status: ${zapResponse.status}`,
    );

    return res.status(200).json({
      success: true,
      today: todayList.length,
      due: dueList.length,
      status: zapResponse.status,
    });
  } catch (err) {
    console.error(
      "✗ Error sending to Zapier:",
      err instanceof Error ? err.message : String(err),
    );

    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
