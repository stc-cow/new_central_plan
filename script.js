/* =======================================================================
   CENTRAL FUEL PLAN – FULL FIXED SCRIPT (FINAL VERSION)
   ======================================================================= */

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv';

const SA_CENTER = [23.8859, 45.0792];
const SA_BOUNDS = [
    [16.3, 32.0],
    [32.15, 55.8]
];

const STATUS_COLORS = {
    due: '#ff6b6b',
    today: '#ff6b6b',
    coming3: '#ffbe0b',
    next15: '#3ad17c'
};

let map;
let sitesData = [];
let markers = [];
let siteMap = {};
let pulsingCircles = [];
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
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, idx) => {
            row[header.toLowerCase()] = values[idx] ? values[idx].trim() : "";
        });
        data.push(row);
    }
    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let char of line) {
        if (char === '"') insideQuotes = !insideQuotes;
        else if (char === "," && !insideQuotes) {
            result.push(current);
            current = "";
        } else current += char;
    }
    result.push(current);
    return result;
}

/* =====================================================================
   DATA FILTERING + MAPPING (Column B + Column AJ)
   ===================================================================== */

function filterAndValidateSites(raw) {
    return raw
        .filter(row => {
            const region = (row.regionname || "").trim();
            const status = (row.cowstatus || "").trim().toUpperCase();

            const lat = parseFloat(row.lat || row.latitude || "");
            const lng = parseFloat(row.lng || row.longitude || "");
            const sitename = row.sitename || "";

            return (
                region.includes("Central") &&
                (status === "ON-AIR" || status === "IN PROGRESS") &&
                sitename.trim() !== "" &&
                !isNaN(lat) &&
                !isNaN(lng)
            );
        })
        .map(row => {
            const cowId =
                row.cowid ||
                row["cow id"] ||
                row["cow_id"] ||
                row.sitename ||
                "";

            const nextFuel = row.nextfuelingplan || row["next fueling plan"] || "";
            const fuelDate = parseFuelDate(nextFuel);

            const days = dayDiff(fuelDate);
            const statusObj = classify(days);

            return {
                sitename: row.sitename || "Unknown Site",
                cowid: cowId,
                nextfuelingplan: nextFuel,
                lat: parseFloat(row.lat || row.latitude),
                lng: parseFloat(row.lng || row.longitude),
                fuelDate,
                days,
                status: statusObj.label,
                color: statusObj.color
            };
        });
}

function parseFuelDate(str) {
    if (!str || str.includes("#")) return null;
    const d = new Date(str);
    return isNaN(d) ? null : d;
}

function dayDiff(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const t = new Date(date);
    t.setHours(0, 0, 0, 0);
    return Math.round((t - today) / (1000 * 3600 * 24));
}

function classify(days) {
    if (days === null) return { label: "next15", color: "#3ad17c" };
    if (days < 0) return { label: "due", color: "#ff6b6b" };
    if (days === 0) return { label: "today", color: "#ff6b6b" };
    if (days <= 3) return { label: "coming3", color: "#ffbe0b" };
    return { label: "next15", color: "#3ad17c" };
}

/* =====================================================================
   METRICS
   ===================================================================== */

function updateMetrics(sites) {
    document.getElementById("totalSites").textContent = sites.length;
    document.getElementById("dueSites").textContent = sites.filter(s => s.status === "due").length;
    document.getElementById("todaySites").textContent = sites.filter(s => s.status === "today").length;
    document.getElementById("futureSites").textContent = sites.filter(s => s.status === "next15").length;
}

/* =====================================================================
   MAP + MARKERS
   ===================================================================== */

function initMap() {
    map = L.map("map").setView(SA_CENTER, 5);
    map.setMaxBounds(SA_BOUNDS);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}").addTo(map);
}

function addMarkersToMap(sites) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    siteMap = {};

    sites.forEach(site => {
        const icon = L.divIcon({
            className: "custom-marker",
            html: `<div style="background:${site.color};width:24px;height:24px;border-radius:50%;border:3px solid white;"></div>`,
            iconSize: [30, 30]
        });

        const marker = L.marker([site.lat, site.lng], { icon })
            .bindPopup(`
                <h4>${site.sitename}</h4>
                <strong>COW ID:</strong> ${site.cowid}<br>
                <strong>Fuel Date:</strong> ${site.nextfuelingplan}<br>
                <strong>Status:</strong> ${site.status}<br>
                <strong>Days:</strong> ${site.days}
            `)
            .addTo(map);

        markers.push(marker);

        // SAVE uppercase keys for search
        siteMap[site.sitename.toUpperCase()] = { marker, site };
        siteMap[site.cowid.toUpperCase()] = { marker, site };
    });
}

function zoomToSite(key) {
    const s = siteMap[key.toUpperCase()];
    if (!s) return;
    map.setView(s.marker.getLatLng(), 16);
    s.marker.openPopup();
}

/* =====================================================================
   SEARCH – FIXED VERSION
   ===================================================================== */

function setupSearch() {
    if (searchInitialized) return;

    const input = document.getElementById('siteSearchInput');
    const button = document.getElementById('searchBtn');
    const popup = document.getElementById('searchPopup');
    const popupContent = document.getElementById('popupContent');
    const popupClose = document.getElementById('popupClose');

    const performSearch = () => {
        const query = input.value.trim().toUpperCase();

        if (!query) {
            popupContent.innerHTML = "⚠️ Please enter a Site ID or COW ID.";
            popup.style.display = "block";
            return;
        }

        const site = sitesData.find(s =>
            s.sitename.toUpperCase() === query ||
            (s.cowid || "").toUpperCase() === query
        );

        if (!site) {
            popupContent.innerHTML = `❌ No match found for <strong>${query}</strong>.`;
            popup.style.display = "block";
            return;
        }

        // Fill popup content
        popupContent.innerHTML = `
            <strong>Site ID:</strong> ${site.sitename}<br>
            <strong>Next Fueling Date:</strong> ${site.nextfuelingplan || "N/A"}<br>
        `;

        popup.style.display = "block";

        // Zoom to site on map
        zoomToSite(site.sitename);
    };

    button.addEventListener('click', performSearch);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') performSearch();
    });

    popupClose.addEventListener('click', () => {
        popup.style.display = 'none';
    });

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
