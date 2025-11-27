/* =======================================================================
   CENTRAL FUEL PLAN – FULL FIXED SCRIPT (FINAL VERSION)
======================================================================= */

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";

const SA_CENTER = [23.8859, 45.0792];
const SA_BOUNDS = [
  [16.3, 32.0],
  [32.15, 55.8],
];

const STATUS_COLORS = {
  due: "#ff6b6b",
  today: "#ff6b6b",
  coming3: "#ffbe0b",
  next15: "#3ad17c",
};

let map;
let sitesData = [];
let markers = [];
let siteMap = {};
let searchInitialized = false;

/* =====================================================================
   CSV LOADING
===================================================================== */

async function fetchCSV() {
  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (err) {
    console.error("CSV Load Error:", err);
    return [];
  }
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const out = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ? values[idx].trim() : "";
    });
    out.push(row);
  }

  return out;
}

function parseCSVLine(line) {
  const res = [];
  let cur = "";
  let inside = false;

  for (let c of line) {
    if (c === '"') inside = !inside;
    else if (c === "," && !inside) {
      res.push(cur);
      cur = "";
    } else cur += c;
  }
  res.push(cur);
  return res;
}

/* =====================================================================
   FIXED COLUMN MAPPING FOR YOUR SHEET
===================================================================== */
/*
sitename = Column B
regionname = Column D
cowstatus = Column J
lat = Column L
lng = Column M
nextfuelingplan = Column AJ
*/

function filterAndValidateSites(raw) {
  return raw
    .filter((row) => {
      const sitename = row["sitename"];
      const region = row["regionname"];
      const status = row["cowstatus"];
      const lat = parseFloat(row["lat"]);
      const lng = parseFloat(row["lng"]);

      return (
        sitename &&
        region &&
        region.includes("Central") &&
        (status === "ON-AIR" || status === "IN PROGRESS") &&
        !isNaN(lat) &&
        !isNaN(lng)
      );
    })
    .map((row) => {
      const sitename = row["sitename"];
      const cowId = sitename; // you don’t have COW ID column, sitename is used
      const nextFuel = row["nextfuelingplan"];

      const fuelDate = parseFuelDate(nextFuel);
      const days = dayDiff(fuelDate);
      const classification = classify(days);

      return {
        sitename,
        cowid: cowId,
        nextfuelingplan: nextFuel,
        lat: parseFloat(row["lat"]),
        lng: parseFloat(row["lng"]),
        days,
        status: classification.label,
        color: classification.color,
      };
    });
}

function parseFuelDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function dayDiff(date) {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const t = new Date(date);
  t.setHours(0, 0, 0, 0);

  return Math.round((t - today) / 86400000);
}

function classify(days) {
  if (days === null) return { label: "next15", color: "#3ad17c" };
  if (days < 0) return { label: "due", color: "#ff6b6b" };
  if (days === 0) return { label: "today", color: "#ff6b6b" };
  if (days <= 3) return { label: "coming3", color: "#ffbe0b" };
  return { label: "next15", color: "#3ad17c" };
}

/* =====================================================================
   METRICS + TABLES RESTORED (FULL FIX)
===================================================================== */

function updateMetrics(sites) {
  document.getElementById("totalSites").textContent = sites.length;
  document.getElementById("dueSites").textContent = sites.filter((s) => s.status === "due").length;
  document.getElementById("todaySites").textContent = sites.filter((s) => s.status === "today").length;
  document.getElementById("futureSites").textContent = sites.filter((s) => s.status === "next15").length;

  populateDueTodayComingTables(sites);
}

function populateDueTodayComingTables(sites) {
  const overdue = sites.filter((s) => s.status === "due");
  const today = sites.filter((s) => s.status === "today");
  const coming = sites.filter((s) => s.status === "coming3");

  fillTable("overdueTableBody", overdue, (s) => `
      <td>${s.sitename}</td>
      <td style="color:#ff6b6b">${s.days}</td>
  `);

  fillTable("todayTableBody", today, (s) => `
      <td>${s.sitename}</td>
      <td>${s.nextfuelingplan}</td>
  `);

  fillTable("comingTableBody", coming, (s) => `
      <td>${s.sitename}</td>
      <td style="color:#ffbe0b">${s.days}</td>
  `);
}

function fillTable(id, list, rowFn) {
  const tbody = document.getElementById(id);
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#aaa;padding:8px;">No Data</td></tr>`;
    return;
  }

  list.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = rowFn(s);
    tr.style.cursor = "pointer";
    tr.onclick = () => zoomToSite(s.sitename);
    tbody.appendChild(tr);
  });
}

/* =====================================================================
   MAP + MARKERS
===================================================================== */

function initMap() {
  map = L.map("map").setView(SA_CENTER, 6);
  map.setMaxBounds(SA_BOUNDS);

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  ).addTo(map);
}

function addMarkersToMap(sites) {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  siteMap = {};

  sites.forEach((s) => {
    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div style="background:${s.color};width:24px;height:24px;border-radius:50%;border:3px solid white;"></div>`,
      iconSize: [30, 30],
    });

    const marker = L.marker([s.lat, s.lng], { icon })
      .bindPopup(`
        <h4>${s.sitename}</h4>
        <p><strong>Fuel Date:</strong> ${s.nextfuelingplan}</p>
        <p><strong>Status:</strong> ${s.status}</p>
        <p><strong>Days:</strong> ${s.days}</p>
      `)
      .addTo(map);

    markers.push(marker);
    siteMap[s.sitename.toUpperCase()] = { marker, site: s };
  });
}

function zoomToSite(name) {
  const s = siteMap[name.toUpperCase()];
  if (!s) return;

  map.setView(s.marker.getLatLng(), 15);
  s.marker.openPopup();
}

/* =====================================================================
   SEARCH POPUP
===================================================================== */

function setupSearch() {
  if (searchInitialized) return;

  const input = document.getElementById("siteSearchInput");
  const btn = document.getElementById("searchBtn");
  const popup = document.getElementById("searchPopup");
  const content = document.getElementById("popupContent");
  const closeBtn = document.getElementById("popupClose");

  const performSearch = () => {
    const q = input.value.trim().toUpperCase();
    if (!q) {
      content.innerHTML = "⚠️ Please enter a Site ID";
      popup.style.display = "block";
      return;
    }

    const site = sitesData.find(
      (s) => s.sitename.toUpperCase() === q
    );

    if (!site) {
      content.innerHTML = `❌ No match found for <b>${q}</b>`;
      popup.style.display = "block";
      return;
    }

    content.innerHTML = `
      <strong>Site:</strong> ${site.sitename}<br>
      <strong>Next Fuel:</strong> ${site.nextfuelingplan}
    `;

    popup.style.display = "block";
    zoomToSite(site.sitename);
  };

  btn.addEventListener("click", performSearch);
  input.addEventListener("keydown", (e) => e.key === "Enter" && performSearch());
  closeBtn.addEventListener("click", () => (popup.style.display = "none"));

  searchInitialized = true;
}

/* =====================================================================
   MAIN
===================================================================== */

async function loadDashboard() {
  const raw = await fetchCSV();
  sitesData = filterAndValidateSites(raw);

  updateMetrics(sitesData);
  addMarkersToMap(sitesData);
  setupSearch();
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadDashboard();
});
