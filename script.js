const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const PROXIED_CSV_URL = CORS_PROXY + CSV_URL;

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
let pulsingCircles = [];
let markersLayer;
let currentPopupOverlay = null;

const ZAPIER_WEBHOOK_URL =
  "https://hooks.zapier.com/hooks/catch/24787962/ukrtq5i/";

async function fetchCSV() {
  try {
    console.log("Attempting to fetch CSV from:", CSV_URL);
    const response = await fetch(CSV_URL, {
      method: "GET",
      headers: {
        Accept: "text/csv",
      },
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log("CSV fetched successfully, length:", csvText.length);

    if (!csvText.trim()) {
      console.warn("CSV response is empty");
      return [];
    }

    const parsed = parseCSV(csvText);
    console.log("Parsed CSV rows:", parsed.length);
    return parsed;
  } catch (error) {
    console.error("Error fetching CSV directly:", error);
    console.log("Attempting fallback with CORS proxy...");

    try {
      const proxyUrl = PROXIED_CSV_URL;
      const proxyResponse = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!proxyResponse.ok) {
        throw new Error(`HTTP Error: ${proxyResponse.status}`);
      }

      const csvText = await proxyResponse.text();
      console.log("CSV fetched via proxy, length:", csvText.length);

      if (!csvText.trim()) {
        return [];
      }

      const parsed = parseCSV(csvText);
      console.log("Parsed CSV rows from proxy:", parsed.length);
      return parsed;
    } catch (proxyError) {
      console.error("Proxy fetch also failed:", proxyError);
      return [];
    }
  }
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  console.log("CSV Headers:", headers);
  console.log("Total headers:", headers.length);

  // Check if sitelabel is in headers
  const sitelabelIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("label"),
  );
  console.log(
    "Site Label column index:",
    sitelabelIndex,
    "Header:",
    headers[sitelabelIndex],
  );

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header.toLowerCase()] = values[index] ? values[index].trim() : "";
    });

    data.push(row);
  }

  console.log("Sample parsed row:", data[0]);
  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function filterAndValidateSites(rawData) {
  return rawData
    .filter((row) => {
      const regionname = row.regionname ? row.regionname.trim() : "";

      const cowstatusKey = Object.keys(row).find(
        (key) => key.toLowerCase() === "cowstatus",
      );
      const cowstatus = cowstatusKey
        ? row[cowstatusKey].trim().toUpperCase()
        : "";

      const lat = parseFloat(row.lat || row.latitude || "");
      const lng = parseFloat(row.lng || row.longitude || "");
      const sitename = row.sitename || "";

      return (
        regionname.includes("Central") &&
        (cowstatus === "ON-AIR" || cowstatus === "IN PROGRESS") &&
        sitename.trim() !== "" &&
        !isNaN(lat) &&
        !isNaN(lng)
      );
    })
    .map((row) => {
      const lat = parseFloat(row.lat || row.latitude || "");
      const lng = parseFloat(row.lng || row.longitude || "");

      const nextfuelingplanKey = Object.keys(row).find(
        (key) => key.toLowerCase() === "nextfuelingplan",
      );
      const nextfuelingplan = nextfuelingplanKey ? row[nextfuelingplanKey] : "";
      const fuelDate = parseFuelDate(nextfuelingplan);
      const days = dayDiff(fuelDate);
      const statusObj = classify(days);

      const lastfuelingdateKey = Object.keys(row).find(
        (key) => key.toLowerCase() === "lastfuelingdate",
      );
      const lastfuelingdate = lastfuelingdateKey ? row[lastfuelingdateKey] : "";

      const lastfuelingqtyKey = Object.keys(row).find(
        (key) => key.toLowerCase() === "lastfuelingqty",
      );
      const lastfuelingqty = lastfuelingqtyKey ? row[lastfuelingqtyKey] : "";

      const districtKey = Object.keys(row).find(
        (key) => key.toLowerCase() === "districtname",
      );
      const districtname = districtKey ? row[districtKey] : "";

      const cityKey = Object.keys(row).find(
        (key) => key.toLowerCase() === "cityname",
      );
      const cityname = cityKey ? row[cityKey] : "";

      const sitelabelKey = Object.keys(row).find(
        (key) => key.toLowerCase() === "sitelabel",
      );
      const sitelabel = sitelabelKey ? row[sitelabelKey] : "";

      return {
        sitename: row.sitename || "Unknown Site",
        regionname: row.regionname || "",
        districtname: districtname || "",
        cityname: cityname || "",
        cowstatus: row.cowstatus || "",
        sitelabel: sitelabel || "",
        lat: lat,
        lng: lng,
        lastfuelingdate: lastfuelingdate || "",
        lastfuelingqty: lastfuelingqty || "",
        nextfuelingplan: nextfuelingplan || "",
        fuelDate: fuelDate,
        days: days,
        status: statusObj.label,
        color: statusObj.color,
      };
    });
}

function parseFuelDate(str) {
  if (!str || str.includes("#") || str.trim() === "") return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function dayDiff(targetDate) {
  if (!targetDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const t = new Date(targetDate);
  t.setHours(0, 0, 0, 0);

  return Math.round((t - today) / (1000 * 60 * 60 * 24));
}

function classify(days) {
  if (days === null) return { label: "next15", color: "#3ad17c" };

  if (days < 0) return { label: "due", color: "#ff6b6b" };
  if (days === 0) return { label: "today", color: "#ff6b6b" };
  if (days >= 1 && days <= 3) return { label: "coming3", color: "#ffbe0b" };
  if (days >= 4 && days <= 15) return { label: "next15", color: "#3ad17c" };

  return { label: "next15", color: "#3ad17c" };
}

function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.next15;
}

function getStatusLabel(status) {
  const labels = {
    due: "Overdue",
    today: "Today",
    coming3: "Coming Soon",
    next15: "Healthy",
  };
  return labels[status] || "Unknown";
}

function isDueSite(site) {
  if (!site.regionname || !site.regionname.includes("Central")) {
    return false;
  }

  const validStatus =
    site.cowstatus === "ON-AIR" || site.cowstatus === "In Progress";
  if (!validStatus) {
    return false;
  }

  if (!site.nextfuelingplan || !site.nextfuelingplan.trim()) {
    return false;
  }

  const nextFuelingDate = new Date(site.nextfuelingplan);
  if (isNaN(nextFuelingDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return nextFuelingDate < today;
}

function updateMetrics(sites) {
  const totalSites = sites.length;
  const dueSites = sites.filter((s) => isDueSite(s)).length;
  const todaySites = sites.filter((s) => s.status === "today").length;
  const futureSites = sites.filter((s) => s.status === "next15").length;

  document.getElementById("totalSites").textContent = totalSites;
  document.getElementById("dueSites").textContent = dueSites;
  document.getElementById("todaySites").textContent = todaySites;
  document.getElementById("futureSites").textContent = futureSites;

  updateKPIChart(totalSites, dueSites, todaySites);
}

function updateKPIChart(totalSites, dueSites, todaySites) {
  const compliantCount = totalSites - dueSites;
  const performancePercentage =
    totalSites > 0 ? Math.round((compliantCount / totalSites) * 100) : 0;
  const nonCompliantPercentage = 100 - performancePercentage;

  document.getElementById("kpiPercentage").textContent =
    performancePercentage + "%";

  const ctx = document.getElementById("kpiChart");
  if (!ctx) return;

  if (window.kpiChartInstance) {
    window.kpiChartInstance.data.datasets[0].data = [
      performancePercentage,
      nonCompliantPercentage,
    ];
    window.kpiChartInstance.update();
  } else {
    window.kpiChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [performancePercentage, nonCompliantPercentage],
            backgroundColor: ["#3ad17c", "#ff6b6b"],
            borderColor: ["#3ad17c", "#ff6b6b"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
        cutout: "70%",
      },
    });
  }
}

function sendToZapier(sites) {
  const dueSites = sites.filter((s) => isDueSite(s));
  const todaySites = sites.filter((s) => s.status === "today");

  const dueData = dueSites.map((s) => ({
    site: s.sitename,
    date: s.nextfuelingplan || "N/A",
    days: s.days,
  }));

  const todayData = todaySites.map((s) => ({
    site: s.sitename,
    date: s.nextfuelingplan || "N/A",
  }));

  const payload = {
    today: todayData,
    due: dueData,
    timestamp: new Date().toISOString(),
    totalSites: sites.length,
    totalDue: dueSites.length,
    totalToday: todaySites.length,
  };

  fetch(ZAPIER_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (response.ok) {
        console.log("✓ Zapier webhook sent successfully");
      } else {
        console.warn("Zapier webhook response:", response.status);
      }
    })
    .catch((error) => {
      console.error("✗ Error sending to Zapier:", error);
    });
}

function populateDueTable(sites) {
  const dueSites = sites
    .filter((s) => isDueSite(s))
    .sort((a, b) => a.sitename.localeCompare(b.sitename));

  const todaySites = sites
    .filter((s) => s.status === "today")
    .sort((a, b) => a.sitename.localeCompare(b.sitename));

  const comingSites = sites
    .filter((s) => s.status === "coming3")
    .sort((a, b) => a.sitename.localeCompare(b.sitename));

  populateOverdueTable(dueSites);
  populateTodayTable(todaySites);
  populateComingTable(comingSites);
}

function populateOverdueTable(sites) {
  const tbody = document.getElementById("overdueTableBody");
  tbody.innerHTML = "";

  if (sites.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="2" style="text-align: center; color: #94a3b8; padding: 12px;">No overdue sites</td>';
    tbody.appendChild(tr);
    return;
  }

  sites.forEach((site) => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.innerHTML = `
            <td>${site.sitename}</td>
            <td><span style="color: #ff6b6b; font-weight: 600;">${site.days}</span></td>
        `;
    tr.addEventListener("click", () => zoomToSite(site.sitename));
    tbody.appendChild(tr);
  });
}

function populateTodayTable(sites) {
  const tbody = document.getElementById("todayTableBody");
  tbody.innerHTML = "";

  if (sites.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="2" style="text-align: center; color: #94a3b8; padding: 12px;">No sites due today</td>';
    tbody.appendChild(tr);
    return;
  }

  sites.forEach((site) => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.innerHTML = `
            <td>${site.sitename}</td>
            <td>${site.nextfuelingplan}</td>
        `;
    tr.addEventListener("click", () => zoomToSite(site.sitename));
    tbody.appendChild(tr);
  });
}

function populateComingTable(sites) {
  const tbody = document.getElementById("comingTableBody");
  tbody.innerHTML = "";

  const oneDay = sites.filter((s) => s.days === 1).length;
  const twoDays = sites.filter((s) => s.days === 2).length;
  const threeDays = sites.filter((s) => s.days === 3).length;

  const summaryElement = document.getElementById("comingSummary");
  if (summaryElement) {
    summaryElement.textContent = `- One day (${oneDay}), Two days (${twoDays}), Three days (${threeDays})`;
  }

  if (sites.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="2" style="text-align: center; color: #94a3b8; padding: 12px;">No sites coming in 3 days</td>';
    tbody.appendChild(tr);
    return;
  }

  sites.forEach((site) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${site.sitename}</td>
            <td><span style="color: #ffbe0b; font-weight: 600;">${site.days}</span></td>
        `;
    tbody.appendChild(tr);
  });
}

function initMap() {
  // OpenLayers base layer
  const baseLayer = new ol.layer.Tile({
    source: new ol.source.OSM({
      attributions: ol.source.OSM.ATTRIBUTION,
    }),
  });

  // Transit layer from OSM data (using a public transit overlay)
  const transitLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: "https://tiles.openptmap.org/ptlines/{z}/{x}/{y}.png",
      attributions: "© OpenStreetMap contributors | © OpenPT Map",
    }),
  });

  // Initialize map
  map = new ol.Map({
    target: "map",
    layers: [baseLayer, transitLayer],
    view: new ol.View({
      center: ol.proj.fromLonLat([SA_CENTER[1], SA_CENTER[0]]),
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
    }),
  });

  // Store markers layer
  markersLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
  });
  map.addLayer(markersLayer);
}

function addMarkersToMap(sites) {
  // Clear existing markers and features
  markersLayer.getSource().clear();
  markers = [];
  siteMap = {};
  pulsingCircles = [];

  const features = [];
  const bounds = [];

  sites.forEach((site) => {
    const color = site.color || getStatusColor(site.status);
    const coords = ol.proj.fromLonLat([site.lng, site.lat]);

    // Create marker feature
    const feature = new ol.Feature({
      geometry: new ol.geom.Point(coords),
      siteName: site.sitename,
      status: site.status,
      days: site.days,
      nextFuelingPlan: site.nextfuelingplan,
      statusLabel: getStatusLabel(site.status),
    });

    // Set style for the marker
    const style = new ol.style.Style({
      image: new ol.style.Circle({
        radius: 8,
        fill: new ol.style.Fill({
          color: color,
        }),
        stroke: new ol.style.Stroke({
          color: "white",
          width: 2,
        }),
      }),
    });
    feature.setStyle(style);

    features.push(feature);
    bounds.push(coords);

    // Store marker info for interaction
    markers.push(feature);
    siteMap[site.sitename] = {
      feature: feature,
      site: site,
      coords: coords,
    };
  });

  // Add all features to the layer
  markersLayer.getSource().addFeatures(features);

  // Add click handler for markers
  map.on("click", function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });

    if (feature && markersLayer.getSource().getFeatures().includes(feature)) {
      const siteName = feature.get("siteName");
      const status = feature.get("status");
      const days = feature.get("days");
      const nextFuelingPlan = feature.get("nextFuelingPlan");
      const statusLabel = feature.get("statusLabel");

      const popupContent = `
        <div class="ol-popup-content">
          <h4>${siteName}</h4>
          <p><strong>Status:</strong> ${statusLabel}</p>
          <p><strong>Days:</strong> ${days !== null ? days : "N/A"}</p>
          <p><strong>Fuel Date:</strong> ${nextFuelingPlan || "No Date"}</p>
        </div>
      `;

      const popup = document.createElement("div");
      popup.innerHTML = popupContent;
      popup.className = "ol-popup";

      // Remove old popup if exists
      if (currentPopupOverlay) {
        map.removeOverlay(currentPopupOverlay);
      }

      // Add new popup to map
      const overlay = new ol.Overlay({
        element: popup,
        positioning: "bottom-center",
        offset: [0, -8],
        autoPan: true,
        autoPanMargin: 250,
      });
      map.addOverlay(overlay);
      overlay.setPosition(feature.getGeometry().getCoordinates());
      currentPopupOverlay = overlay;
    }
  });

  // Fit map to bounds
  if (bounds.length > 0) {
    const extent = ol.extent.boundingExtent(bounds);
    map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      maxZoom: 17,
    });
  }
}

function zoomToSite(sitename) {
  const siteInfo = siteMap[sitename];
  if (siteInfo && siteInfo.coords) {
    map.getView().animate({
      center: siteInfo.coords,
      zoom: 17,
      duration: 500,
    });

    // Show popup with site info
    const popup = document.createElement("div");
    popup.innerHTML = `
      <div style="background: white; padding: 10px; border-radius: 5px; min-width: 200px;">
        <h4 style="margin-top: 0;">${siteInfo.site.sitename}</h4>
        <p><strong>Status:</strong> ${siteInfo.site.status}</p>
        <p><strong>Days:</strong> ${siteInfo.site.days !== null ? siteInfo.site.days : "N/A"}</p>
        <p><strong>Fuel Date:</strong> ${siteInfo.site.nextfuelingplan || "No Date"}</p>
      </div>
    `;
  }
}

async function loadDashboard() {
  console.log("Starting loadDashboard...");
  const rawData = await fetchCSV();
  console.log("Raw data from CSV:", rawData.length, "rows");

  sitesData = filterAndValidateSites(rawData);
  console.log("Filtered sites data:", sitesData.length, "sites");

  if (sitesData.length === 0) {
    console.warn("No sites data available after filtering");
  }

  updateMetrics(sitesData);
  populateDueTable(sitesData);
  addMarkersToMap(sitesData);
  updateEventCards(sitesData);
  console.log("Dashboard loaded successfully");
}

function formatFuelDate(fuelDate) {
  if (!fuelDate) return "N/A";
  const d = new Date(fuelDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function searchSite(siteName) {
  const searchTerm = siteName.trim().toUpperCase();
  const result = sitesData.find(
    (site) => site.sitename.toUpperCase() === searchTerm,
  );

  const modal = document.getElementById("searchModal");
  const resultDiv = document.getElementById("searchResult");

  if (result) {
    const formattedDate = formatFuelDate(result.fuelDate);
    resultDiv.innerHTML = `
            <div class="search-result-item">
                <div class="search-result-site-name">${result.sitename}</div>
                <div class="search-result-date">Next Fueling Date:</div>
                <div class="search-result-date-value">${formattedDate}</div>
            </div>
        `;
  } else {
    resultDiv.innerHTML = `<div class="search-no-result">No site found with name "${siteName}"</div>`;
  }

  modal.classList.add("active");
}

function closeSearchModal() {
  const modal = document.getElementById("searchModal");
  modal.classList.remove("active");
  document.getElementById("searchInput").value = "";
}

function formatDateTimeForExcel() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${h}:${m}:${s}`;
}

function downloadExcel() {
  try {
    if (!window.XLSX) {
      alert("Excel library is still loading. Please try again.");
      console.error("XLSX library not available");
      return;
    }

    const timestamp = formatDateTimeForExcel();

    const exportData = sitesData
      .filter((site) => site.regionname && site.regionname.includes("Central"))
      .map((site) => ({
        "Site Name": site.sitename,
        "Region Name": site.regionname,
        "District Name": site.districtname || "",
        "City Name": site.cityname || "",
        "COW Status": site.cowstatus,
        Latitude: site.lat,
        Longitude: site.lng,
        "Last Fueling Date": site.lastfuelingdate || "",
        "Last Fueling QTY": site.lastfuelingqty || "",
        "Next Fueling Plan": site.nextfuelingplan || "",
      }));

    if (exportData.length === 0) {
      alert("No data to export");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const navyColor = "202B6D";
    const whiteFill = "FFFFFF";
    const blackFont = "000000";
    const whiteFont = "FFFFFF";

    const borderStyle = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };

    const headerStyle = {
      fill: { fgColor: { rgb: navyColor } },
      font: { bold: true, color: { rgb: whiteFont }, size: 12 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: borderStyle,
    };

    const dataStyle = {
      font: { color: { rgb: blackFont } },
      alignment: { horizontal: "left", vertical: "center" },
      border: borderStyle,
    };

    const headerRow = Object.keys(exportData[0]);
    headerRow.forEach((key, idx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
      worksheet[cellRef].s = headerStyle;
    });

    exportData.forEach((row, rowIdx) => {
      Object.keys(row).forEach((key, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = dataStyle;
        }
      });
    });

    worksheet["!cols"] = Array(Object.keys(exportData[0]).length).fill({
      wch: 18,
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, "Central Fuel Plan");

    const fileName = `Central_Fuel_Plan_${timestamp.replace(/[/:]/g, "-")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error("Error downloading Excel:", error);
    alert("Failed to download Excel file. Please try again.");
  }
}

function updateHeaderDate() {
  const headerDateElement = document.getElementById("headerDate");
  if (headerDateElement) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    headerDateElement.textContent = `${formattedDate} ${formattedTime}`;
  }
}

function isVVVIPSite(site) {
  if (!site.regionname || !site.regionname.includes("Central")) {
    return false;
  }

  const validStatus =
    site.cowstatus === "ON-AIR" || site.cowstatus === "In Progress";
  if (!validStatus) {
    return false;
  }

  if (!site.sitelabel || !site.sitelabel.toUpperCase().includes("VVVIP")) {
    return false;
  }

  return true;
}

function updateEventCards(sites) {
  console.log("=== Event Cards Debug ===");
  console.log("Total sites:", sites.length);

  // Show all unique sitelabel values
  const uniqueLabels = [
    ...new Set(sites.map((s) => s.sitelabel).filter(Boolean)),
  ];
  console.log("Unique SiteLabels in data:", uniqueLabels);

  // Show sites that have VVVIP in sitelabel
  const sitesWithVVVIP = sites.filter(
    (s) => s.sitelabel && s.sitelabel.toUpperCase().includes("VVVIP"),
  );
  console.log(
    "Sites with VVVIP label:",
    sitesWithVVVIP.map((s) => ({
      name: s.sitename,
      label: s.sitelabel,
      region: s.regionname,
      status: s.cowstatus,
    })),
  );

  const vvvipSites = sites.filter((s) => isVVVIPSite(s));

  const camelFestivalSites = [
    "CWH076",
    "CWH022",
    "CWH188",
    "COW652",
    "CWH094",
    "CWS808",
    "CWH973",
    "CWH941",
    "CWH942",
    "CWH940",
    "CWH943",
    "CWH944",
    "CWH945",
    "COW636",
    "CWH352",
    "CWH937",
    "CWH935",
  ];
  const camelSites = sites.filter((s) =>
    camelFestivalSites.includes(s.sitename),
  );

  const mdlBeastSites = [
    "COW017",
    "COW018",
    "COW019",
    "COW036",
    "COW762",
    "COW805",
  ];
  const mdlSites = sites.filter((s) => mdlBeastSites.includes(s.sitename));

  console.log("Final VVVIP sites (after criteria filter):", vvvipSites.length);
  console.log("VVVIP criteria check details:");
  if (sitesWithVVVIP.length > 0) {
    sitesWithVVVIP.forEach((s) => {
      console.log(
        `  ${s.sitename}: Region=${s.regionname}, Status=${s.cowstatus}, Pass=${isVVVIPSite(s)}`,
      );
    });
  }

  document.getElementById("vvvipCount").textContent = vvvipSites.length;
  document.getElementById("camelCount").textContent = camelSites.length;
  document.getElementById("mdlCount").textContent = mdlSites.length;
}

function showVVVIPModal() {
  const modal = document.getElementById("vvvipModal");
  const tbody = document.getElementById("vvvipTableBody");
  tbody.innerHTML = "";

  const vvvipSites = sitesData.filter((s) => isVVVIPSite(s));

  if (vvvipSites.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" style="text-align: center; color: #999; padding: 20px;">No VVVIP sites</td></tr>';
  } else {
    vvvipSites.forEach((site) => {
      const tr = document.createElement("tr");

      let rowColor = "#f3f0ff";
      if (site.status === "due") {
        rowColor = "#ffebee";
      } else if (site.status === "today") {
        rowColor = "#fff8e1";
      } else if (site.status === "coming3") {
        rowColor = "#fff8e1";
      } else if (site.status === "next15") {
        rowColor = "#e8f5e9";
      }

      tr.style.backgroundColor = rowColor;

      tr.innerHTML = `
        <td>${site.sitename}</td>
        <td>${site.nextfuelingplan || "N/A"}</td>
        <td>${site.sitelabel || "N/A"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  modal.style.display = "block";
}

function closeVVVIPModal() {
  const modal = document.getElementById("vvvipModal");
  modal.style.display = "none";
}

function showCamelModal() {
  const modal = document.getElementById("camelModal");
  const tbody = document.getElementById("camelTableBody");
  tbody.innerHTML = "";

  const camelFestivalSites = [
    "CWH076",
    "CWH022",
    "CWH188",
    "COW652",
    "CWH094",
    "CWS808",
    "CWH973",
    "CWH941",
    "CWH942",
    "CWH940",
    "CWH943",
    "CWH944",
    "CWH945",
    "COW636",
    "CWH352",
    "CWH937",
    "CWH935",
  ];

  const camelSites = sitesData.filter((s) =>
    camelFestivalSites.includes(s.sitename),
  );

  if (camelSites.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="2" style="text-align: center; color: #999; padding: 20px;">No Camel Festival sites found</td></tr>';
  } else {
    camelSites.forEach((site) => {
      const tr = document.createElement("tr");

      let rowColor = "#fffbf0";
      if (site.status === "due") {
        rowColor = "#ffebee";
      } else if (site.status === "today") {
        rowColor = "#fff8e1";
      } else if (site.status === "coming3") {
        rowColor = "#fff8e1";
      } else if (site.status === "next15") {
        rowColor = "#e8f5e9";
      }

      tr.style.backgroundColor = rowColor;

      tr.innerHTML = `
        <td>${site.sitename}</td>
        <td>${site.nextfuelingplan || "N/A"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  modal.style.display = "block";
}

function closeCamelModal() {
  const modal = document.getElementById("camelModal");
  modal.style.display = "none";
}

function showMDLModal() {
  const modal = document.getElementById("mdlModal");
  const tbody = document.getElementById("mdlTableBody");
  tbody.innerHTML = "";

  const mdlBeastSites = [
    "COW017",
    "COW018",
    "COW019",
    "COW036",
    "COW762",
    "COW805",
  ];

  const mdlSites = sitesData.filter((s) => mdlBeastSites.includes(s.sitename));

  console.log("MDL Beast debug:", {
    totalSites: sitesData.length,
    mdlBeastSitesToMatch: mdlBeastSites,
    foundSites: mdlSites.length,
    allSiteNames: sitesData.map((s) => s.sitename),
  });

  if (mdlSites.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="2" style="text-align: center; color: #999; padding: 20px;">No MDL Beast sites found</td></tr>';
  } else {
    mdlSites.forEach((site) => {
      const tr = document.createElement("tr");

      let rowColor = "#fce7f3";
      if (site.status === "due") {
        rowColor = "#ffebee";
      } else if (site.status === "today") {
        rowColor = "#fff8e1";
      } else if (site.status === "coming3") {
        rowColor = "#fff8e1";
      } else if (site.status === "next15") {
        rowColor = "#e8f5e9";
      }

      tr.style.backgroundColor = rowColor;

      tr.innerHTML = `
        <td>${site.sitename}</td>
        <td>${site.nextfuelingplan || "N/A"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  modal.style.display = "block";
}

function closeMDLModal() {
  const modal = document.getElementById("mdlModal");
  modal.style.display = "none";
}

window.addEventListener("click", (event) => {
  const vvvipModal = document.getElementById("vvvipModal");
  const camelModal = document.getElementById("camelModal");
  const mdlModal = document.getElementById("mdlModal");

  if (event.target === vvvipModal) {
    closeVVVIPModal();
  }
  if (event.target === camelModal) {
    closeCamelModal();
  }
  if (event.target === mdlModal) {
    closeMDLModal();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadDashboard();

  updateHeaderDate();
  setInterval(updateHeaderDate, 1000);

  setInterval(() => {
    console.log("Auto-refreshing dashboard...");
    loadDashboard();
  }, 120000);

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchSite(searchInput.value);
    }
  });

  const modal = document.getElementById("searchModal");
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeSearchModal();
    }
  });
});
