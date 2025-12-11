const API_BASE = window.location.origin;
const CSV_API_URL = `${API_BASE}/api/fetch-csv`;
const INVOICE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1289106706&single=true&output=csv";

const ACES_ACCESS_CODE = "ACES2025";

const VVVIP_SITES_LIST = [
  "COW779",
  "COW820",
  "COW020",
  "COW059",
  "COWE05",
  "COW626",
  "COW774",
  "COW739",
  "COW772",
  "COW518",
  "COW535",
  "COW529",
  "CWH972",
  "COW552",
];

// Test sites with custom radio tower icon
const TOWER_ICON_SITES = [
  "COW775",
  "COW726",
  "COW823",
  "COW056",
  "COW017",
  "COW018",
  "COW801",
];

// ==========================================
// CONSOLE LOCK - Security Protection
// ==========================================

// Disable all console methods
if (window.location.hostname !== "localhost") {
  const noop = () => {};
  console.log = noop;
  console.error = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
  console.group = noop;
  console.groupEnd = noop;
  console.time = noop;
  console.timeEnd = noop;
}

// Detect and block DevTools keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // F12 - Opens DevTools
  if (e.key === "F12" || e.keyCode === 123) {
    e.preventDefault();
    return false;
  }

  // Ctrl+Shift+I (Windows/Linux) - Opens DevTools
  if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
    e.preventDefault();
    return false;
  }

  // Ctrl+Shift+J (Windows/Linux) - Opens Console
  if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
    e.preventDefault();
    return false;
  }

  // Ctrl+Shift+C (Windows/Linux) - Opens Inspector
  if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
    e.preventDefault();
    return false;
  }

  // Cmd+Option+I (Mac) - Opens DevTools
  if (e.metaKey && e.altKey && e.keyCode === 73) {
    e.preventDefault();
    return false;
  }

  // Cmd+Option+J (Mac) - Opens Console
  if (e.metaKey && e.altKey && e.keyCode === 74) {
    e.preventDefault();
    return false;
  }

  // Cmd+Option+U (Mac) - View Source
  if (e.metaKey && e.altKey && e.keyCode === 85) {
    e.preventDefault();
    return false;
  }

  // Ctrl+S (Windows/Linux) - Save page (optional, prevent download)
  // Uncomment if you want to prevent saving the page
  // if (e.ctrlKey && e.keyCode === 83) {
  //   e.preventDefault();
  //   return false;
  // }
});

// Disable right-click context menu (optional - uncomment to enable)
// document.addEventListener("contextmenu", (e) => {
//   e.preventDefault();
//   return false;
// });

// Detect if DevTools is open using debounce technique
setInterval(() => {
  const threshold = 160; // Approximate height of DevTools
  const widthThreshold = 160; // Approximate width when DevTools opens on side

  if (
    window.outerWidth - window.innerWidth > widthThreshold ||
    window.outerHeight - window.innerHeight > threshold
  ) {
    // DevTools detected - optionally lock user out
    // console.clear() is disabled, so we skip it
    // Uncomment below to logout user when DevTools is detected:
    // handleLogout();
  }
}, 500);

// ==========================================
// END CONSOLE LOCK
// ==========================================

// Extract username from URL params
const urlParams = new URLSearchParams(window.location.search);
let urlUsername = urlParams.get("username") || "Guest";

// Initialize or retrieve session ID
function getOrCreateSessionId() {
  let sessionId = localStorage.getItem("session_id");
  if (!sessionId) {
    sessionId =
      "session_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
    localStorage.setItem("session_id", sessionId);
  }
  return sessionId;
}

// Get or create device ID
// All remember-me functionality removed

const SA_CENTER = [23.8859, 45.0792];
const SA_BOUNDS = [
  [16.3, 32.0],
  [32.15, 55.8],
];

const STATUS_COLORS = {
  due: "#d32f2f",
  today: "#ff9e00",
  coming3: "#ffd700",
  next15: "#27ae60",
};

let map;
let sitesData = [];
let markers = [];
let siteMap = {};
let pulsingCircles = [];
let pulsingIntervals = [];
let markersLayer;
let currentPopupOverlay = null;
let dashboardInitialized = false;
let headerIntervalId = null;
let refreshIntervalId = null;
let selectedRegion = "CER";

// Load dashboard on page load
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
});

// Clean up intervals when page is closed or navigated away
window.addEventListener("beforeunload", () => {
  if (headerIntervalId) clearInterval(headerIntervalId);
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  pulsingIntervals.forEach((interval) => clearInterval(interval));
});

async function initializeApp() {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

  if (isLoggedIn) {
    showDashboard();
    startDashboardAsync();
  } else {
    showLoginPage();
    setupLoginForm();
  }
}

function showLoginPage() {
  const loginPage = document.getElementById("loginPage");
  loginPage.classList.add("show");
  document.getElementById("dashboardPage").style.display = "none";
  document.getElementById("analyticsPage").style.display = "none";
}

function showDashboard() {
  document.getElementById("loginPage").classList.remove("show");
  document.getElementById("dashboardPage").style.display = "grid";
  document.getElementById("analyticsPage").style.display = "none";
}

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin();
  });
}

async function handleLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const loginError = document.getElementById("loginError");

  // Validate inputs
  if (!username || !password) {
    loginError.textContent = "Please enter both username and password";
    loginError.style.display = "block";
    return;
  }

  // Validate credentials
  if (username === "Aces@MSD" && password === "ACES@2025") {
    try {
      // Hide error message
      loginError.style.display = "none";

      // Store login status
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("username", username);

      // Show dashboard
      showDashboard();

      // Load data
      await startDashboardAsync();

      // Clear form
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
    } catch (error) {
      loginError.textContent =
        "An error occurred during login. Please try again.";
      loginError.style.display = "block";

      // Reset login state on error
      sessionStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("username");
      dashboardInitialized = false;
      showLoginPage();
    }
  } else {
    // Show error
    loginError.textContent = "Invalid username or password";
    loginError.style.display = "block";
    document.getElementById("password").value = "";
  }
}

async function startDashboardAsync() {
  if (dashboardInitialized) return;
  dashboardInitialized = true;

  try {
    initMap();
    await loadDashboard();

    updateHeaderDate();
    if (headerIntervalId) clearInterval(headerIntervalId);
    headerIntervalId = setInterval(updateHeaderDate, 1000);

    // Auto-sync from CSV in background without duplicating intervals
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(() => {
      backgroundSyncData();
    }, 2000);

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchSite(searchInput.value);
        }
      });
    }

    const searchModal = document.getElementById("searchModal");
    const invoiceModal = document.getElementById("invoiceModal");

    window.addEventListener("click", (e) => {
      if (e.target === searchModal) {
        closeSearchModal();
      }
      if (e.target === invoiceModal) {
        closeInvoiceModal();
      }
    });
  } catch (error) {}
}

window.handleLogout = function handleLogout() {
  // Clear login status
  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("username");

  // Clear intervals
  if (headerIntervalId) clearInterval(headerIntervalId);
  if (refreshIntervalId) clearInterval(refreshIntervalId);

  // Clear pulsing intervals
  pulsingIntervals.forEach((interval) => clearInterval(interval));
  pulsingIntervals = [];

  // Reset dashboard state
  dashboardInitialized = false;

  // Clear markers and map
  if (map) {
    map.off();
    map.remove();
    map = null;
  }
  markers = [];
  siteMap = {};
  sitesData = [];

  // Show login page
  showLoginPage();

  // Clear form fields
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("loginError").style.display = "none";
};

async function fetchCSV() {
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";
  const CORS_PROXIES = [
    "https://corsproxy.io/?",
    "https://api.codetabs.com/v1/proxy?quest=",
  ];

  // Check if API endpoint is available (not static hosting like GitHub Pages)
  const isStaticHosting =
    window.location.hostname.includes("github.io") ||
    window.location.hostname === "localhost";

  // Try API endpoint first (for servers with backend like Fly.dev)
  if (!isStaticHosting) {
    try {
      const fetchPromise = fetch(CSV_API_URL, {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      try {
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (response.ok) {
          const csvText = await response.text();
          if (csvText.trim()) {
            const parsed = parseCSV(csvText);
            return parsed;
          }
        }
      } catch (fetchError) {
        // Silently ignore timeout and fetch failures
        if (fetchError.message !== "timeout") {
          console.debug("API fetch failed:", fetchError.message);
        }
      }
    } catch (error) {
      // API endpoint not available, try alternatives
    }
  }

  // Try CORS proxies
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    try {
      let proxyUrl;
      if (CORS_PROXIES[i].includes("?")) {
        proxyUrl = CORS_PROXIES[i] + CSV_URL;
      } else {
        proxyUrl = CORS_PROXIES[i] + encodeURIComponent(CSV_URL);
      }

      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          Accept: "text/plain",
        },
      });

      if (response.ok) {
        const csvText = await response.text();

        if (csvText.trim()) {
          const parsed = parseCSV(csvText);
          return parsed;
        }
      }
    } catch (proxyError) {
      // CORS proxy error, try next proxy
    }
  }

  // Last resort: try direct Google Sheets fetch
  try {
    const response = await fetch(CSV_URL, {
      method: "GET",
      mode: "cors",
    });

    if (response.ok) {
      const csvText = await response.text();
      if (csvText.trim()) {
        const parsed = parseCSV(csvText);
        return parsed;
      }
    }
  } catch (error) {}

  return [];
}

function escapeHTML(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

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

      const siteObj = { regionname };
      return (
        isInSelectedRegion(siteObj) &&
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

      let siteColor = statusObj.color;

      if (nextfuelingplan.trim() === "SEC Site") {
        siteColor = "#9b59b6";
      }

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
        color: siteColor,
      };
    });
}

function parseFuelDate(str) {
  if (!str || str.includes("#") || str.trim() === "") return null;

  // Handle DD/MM/YYYY format from CSV Column AE
  const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = str.trim().match(ddmmyyyyRegex);

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Create date object (month is 0-indexed in JS)
    const d = new Date(year, month - 1, day);

    // Validate the date
    if (isNaN(d.getTime())) {
      return null;
    }

    return d;
  }

  // Fallback: try parsing as standard date format
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Convert date string to YYYY-MM-DD format
// Handle multiple possible formats from CSV
function convertDateToISO(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;

  dateStr = dateStr.trim();

  // Silently skip Excel error codes and invalid values
  if (
    dateStr === "#N/A" ||
    dateStr === "#REF!" ||
    dateStr === "#VALUE!" ||
    dateStr === "#ERROR!"
  ) {
    return null;
  }

  // Try DD/MM/YYYY format
  const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  let match = dateStr.match(ddmmyyyyRegex);

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validate month and day
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    // Format as YYYY-MM-DD
    const monthStr = String(month).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");

    return `${year}-${monthStr}-${dayStr}`;
  }

  // Try YYYY-MM-DD format (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try MM/DD/YYYY format
  const mmddyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  match = dateStr.match(mmddyyyyRegex);
  if (match) {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    const monthStr = String(month).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");

    return `${year}-${monthStr}-${dayStr}`;
  }

  // Silently fail for unparseable dates (data quality issue, not code error)
  return null;
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
  if (days === null) return { label: "next15", color: "#27ae60" };

  if (days < 0) return { label: "due", color: "#d32f2f" };
  if (days === 0) return { label: "today", color: "#d32f2f" };
  if (days >= 1 && days <= 3) return { label: "coming3", color: "#ff9e00" };
  if (days >= 4 && days <= 15) return { label: "next15", color: "#27ae60" };

  return { label: "next15", color: "#27ae60" };
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
  if (!isInSelectedRegion(site)) {
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

function populateDueTable(sites) {
  const dueSites = sites
    .filter((s) => isDueSite(s))
    .sort((a, b) => new Date(a.nextfuelingplan) - new Date(b.nextfuelingplan));

  const todaySites = sites
    .filter((s) => s.status === "today")
    .sort((a, b) => new Date(a.nextfuelingplan) - new Date(b.nextfuelingplan));

  const comingSites = sites
    .filter((s) => s.status === "coming3")
    .sort((a, b) => a.days - b.days);

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
            <td>${site.nextfuelingplan}</td>
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
  // Initialize Leaflet map
  map = L.map("map").setView([SA_CENTER[0], SA_CENTER[1]], 5);

  // Street Layer (OSM Standard)
  const street = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    },
  );

  // Satellite Layer (ESRI)
  const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles © Esri",
    },
  );

  // Hybrid Layer (satellite + labels)
  const hybrid = L.layerGroup([
    satellite,
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Labels © Esri",
      },
    ),
  ]);

  // Terrain Layer
  const terrain = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 17,
      attribution: "Map data © OpenTopoMap",
    },
  );

  // Add default street layer
  street.addTo(map);

  // Add layer control
  L.control
    .layers(
      {
        Street: street,
        Satellite: satellite,
        Hybrid: hybrid,
        Terrain: terrain,
      },
      {},
      { position: "topright" },
    )
    .addTo(map);

  // Create feature group for markers
  markersLayer = L.featureGroup().addTo(map);

  // Listen for zoom changes
  map.on("zoomend", function () {
    const zoom = map.getZoom();
    updateMapVisualization(zoom);
  });

  // Add map legend
  addMapLegend();
}

function addMapLegend() {
  const legendContainer = document.createElement("div");
  legendContainer.className = "map-legend";
  legendContainer.innerHTML = `
    <div class="legend-title">Status Legend</div>
    <div class="legend-item">
      <div class="legend-color healthy"></div>
      <span class="legend-label">Healthy</span>
    </div>
    <div class="legend-item">
      <div class="legend-color due"></div>
      <span class="legend-label">Due</span>
    </div>
    <div class="legend-item">
      <div class="legend-color coming"></div>
      <span class="legend-label">Coming Soon</span>
    </div>
    <div class="legend-item">
      <div class="legend-color sec"></div>
      <span class="legend-label">SEC Site</span>
    </div>
  `;

  const mapContainer = document.getElementById("map");
  mapContainer.appendChild(legendContainer);

  legendContainer.style.position = "absolute";
  legendContainer.style.bottom = "15px";
  legendContainer.style.left = "15px";
  legendContainer.style.zIndex = "100";
}

function addPulsingCircles(markers) {
  if (!markers || markers.length === 0) return;

  let pulsePhase = 0;
  const pulseInterval = setInterval(() => {
    pulsePhase += 0.05;
    if (pulsePhase > 2 * Math.PI) {
      pulsePhase = 0;
    }

    markers.forEach((marker) => {
      const siteData = marker.siteData;
      if (siteData && siteData.status === "due") {
        const scale = 1 + 0.8 * Math.sin(pulsePhase);
        const radius = 8 * scale;
        const opacity = 0.5 * (1.8 - scale);

        marker.setRadius(radius);
        marker.setStyle({
          fillOpacity: opacity,
          opacity: opacity,
          color: "#ff6b6b",
        });
      }
    });
  }, 50);

  pulsingIntervals.push(pulseInterval);
}

function updateMapVisualization(zoom) {
  const HEATMAP_THRESHOLD = 10;

  markersLayer.eachLayer((marker) => {
    if (zoom >= HEATMAP_THRESHOLD) {
      // Show individual markers at high zoom
      marker.setRadius(8);
      marker.setStyle({
        fillOpacity: 0.8,
        opacity: 1,
      });
    } else {
      // Show heatmap-style visualization at low zoom
      const radius = 15 - (zoom || 5);
      marker.setRadius(radius);
      marker.setStyle({
        fillOpacity: 0.6,
        opacity: 0.6,
      });
    }
  });
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function addMarkersToMap(sites) {
  // Clear existing markers and pulsing intervals
  markersLayer.clearLayers();
  markers = [];
  siteMap = {};

  // Clear any existing pulsing intervals
  pulsingIntervals.forEach((interval) => clearInterval(interval));
  pulsingIntervals = [];

  const bounds = L.latLngBounds();

  sites.forEach((site) => {
    const color = site.color || getStatusColor(site.status);
    const isTowerSite = TOWER_ICON_SITES.includes(site.sitename);

    let marker;

    if (isTowerSite) {
      // Create custom icon marker for tower sites
      const towerIcon = L.icon({
        iconUrl: "https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2F5428de61b901456a920448ded075b4b7?format=webp&width=100",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });

      marker = L.marker([site.lat, site.lng], {
        icon: towerIcon,
      });

      marker.addTo(markersLayer);
    } else {
      // Create circle marker for regular sites
      marker = L.circleMarker([site.lat, site.lng], {
        radius: 8,
        fillColor: color,
        color: "white",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      marker.addTo(markersLayer);
    }

    // Store marker reference
    marker.siteData = {
      siteName: site.sitename,
      status: site.status,
      days: site.days,
      nextFuelingPlan: site.nextfuelingplan,
      statusLabel: getStatusLabel(site.status),
    };
    markers.push(marker);

    // Store marker info for interaction
    siteMap[site.sitename] = {
      marker: marker,
      site: site,
      coords: [site.lat, site.lng],
    };

    // Add popup on click
    marker.on("click", () => {
      const popupContent = `
        <div class="leaflet-popup-content-wrapper">
          <div class="ol-popup-header">
            <h4>${site.sitename}</h4>
          </div>
          <p><strong>Status:</strong> ${getStatusLabel(site.status)}</p>
          <p><strong>Days:</strong> ${site.days !== null ? site.days : "N/A"}</p>
          <p><strong>Fuel Date:</strong> ${site.nextfuelingplan || "No Date"}</p>
        </div>
      `;

      marker.bindPopup(popupContent).openPopup();
    });

    // Add to bounds
    bounds.extend([site.lat, site.lng]);
  });

  // Initialize map visualization
  const zoom = map.getZoom();
  updateMapVisualization(zoom);

  // Add pulsing circles for red sites (due/overdue)
  addPulsingCircles(markers);

  // Fit map to bounds
  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [50, 50, 50, 50],
      maxZoom: 17,
    });
  }
}

window.zoomToSite = function zoomToSite(sitename) {
  const siteInfo = siteMap[sitename];
  if (siteInfo && siteInfo.coords && siteInfo.marker) {
    map.setView(siteInfo.coords, 17, { animate: true, duration: 0.5 });

    // Show popup on the marker
    const popupContent = `
      <div style="background: white; padding: 10px; border-radius: 5px; min-width: 200px;">
        <h4 style="margin-top: 0;">${siteInfo.site.sitename}</h4>
        <p><strong>Status:</strong> ${getStatusLabel(siteInfo.site.status)}</p>
        <p><strong>Days:</strong> ${siteInfo.site.days !== null ? siteInfo.site.days : "N/A"}</p>
        <p><strong>Fuel Date:</strong> ${siteInfo.site.nextfuelingplan || "No Date"}</p>
      </div>
    `;
    siteInfo.marker.bindPopup(popupContent).openPopup();
  }
};

async function loadDashboard() {
  try {
    const rawData = await fetchCSV();

    sitesData = filterAndValidateSites(rawData);

    // Update UI regardless of migration success
    try {
      updateMetrics(sitesData);
      populateDueTable(sitesData);
      addMarkersToMap(sitesData);
      updateEventCards(sitesData);
    } catch (uiErr) {}
  } catch (error) {}
}

function formatFuelDate(fuelDate) {
  if (!fuelDate) return "N/A";
  const d = new Date(fuelDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return "N/A";

  // Try parsing the date string
  let date;

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    date = new Date(dateStr + "T00:00:00");
  }
  // Try DD/MM/YYYY format
  else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const parts = dateStr.split("/");
    date = new Date(parts[2], parts[1] - 1, parts[0]);
  }
  // Try standard Date parsing
  else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) return "N/A";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

window.searchSite = function searchSite(siteName) {
  const searchTerm = siteName.trim().toUpperCase();
  const result = sitesData.find(
    (site) => site.sitename.toUpperCase() === searchTerm,
  );

  const modal = document.getElementById("searchModal");
  const resultDiv = document.getElementById("searchResult");

  if (result) {
    const nextFuelingDate = formatDateShort(result.nextfuelingplan);
    const lastFuelingDate = formatDateShort(result.lastfuelingdate);
    const lastFuelingQty = result.lastfuelingqty
      ? parseFloat(result.lastfuelingqty).toFixed(2)
      : "N/A";

    // Calculate days remaining until next fueling
    const daysRemaining = dayDiff(result.nextfuelingplan);
    let daysStatusText = "N/A";
    let highlightColor = "#e8f5e9";
    let borderColor = "#27ae60";
    let statusColor = "#27ae60";

    if (daysRemaining !== null) {
      if (daysRemaining < 0) {
        daysStatusText = `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? "s" : ""}`;
        highlightColor = "#ffebee";
        borderColor = "#d32f2f";
        statusColor = "#d32f2f";
      } else if (daysRemaining === 0) {
        daysStatusText = "Due Today";
        highlightColor = "#fff8e1";
        borderColor = "#ff9e00";
        statusColor = "#ff9e00";
      } else {
        daysStatusText = `Coming in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`;
        highlightColor = "#e8f5e9";
        borderColor = "#27ae60";
        statusColor = "#27ae60";
      }
    }

    resultDiv.innerHTML = `
      <div class="search-result-item" style="background: linear-gradient(135deg, ${highlightColor} 0%, #ffffff 100%); border: 3px solid ${borderColor};">
        <div class="search-result-header">
          <div class="search-result-site-name">${escapeHTML(result.sitename)}</div>
        </div>
        <div class="search-result-table">
          <div class="search-result-row">
            <div class="search-result-label">Last Fueling Date</div>
            <div class="search-result-value">${escapeHTML(lastFuelingDate)}</div>
          </div>
          <div class="search-result-row">
            <div class="search-result-label">Last Fueling Qty</div>
            <div class="search-result-value">${escapeHTML(lastFuelingQty)}</div>
          </div>
          <div class="search-result-row">
            <div class="search-result-label">Next Fueling Date</div>
            <div class="search-result-value">${escapeHTML(nextFuelingDate)}</div>
          </div>
          <div class="search-result-row">
            <div class="search-result-label">Days Remaining</div>
            <div class="search-result-value" style="font-weight: 700; color: ${statusColor};">${daysStatusText}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    resultDiv.innerHTML = `<div class="search-no-result">No site found with name "${siteName}"</div>`;
  }

  modal.classList.add("active");
};

window.closeSearchModal = function closeSearchModal() {
  const modal = document.getElementById("searchModal");
  modal.classList.remove("active");
  document.getElementById("searchInput").value = "";
};

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

window.downloadExcel = function downloadExcel() {
  try {
    if (!window.XLSX) {
      alert("Excel library is still loading. Please try again.");
      return;
    }

    const timestamp = formatDateTimeForExcel();

    const exportData = sitesData
      .filter((site) => isInSelectedRegion(site))
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
    alert("Failed to download Excel file. Please try again.");
  }
};

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
  if (!isInSelectedRegion(site)) {
    return false;
  }

  const validStatus =
    site.cowstatus === "ON-AIR" || site.cowstatus === "In Progress";
  if (!validStatus) {
    return false;
  }

  if (!VVVIP_SITES_LIST.includes(site.sitename)) {
    return false;
  }

  return true;
}

function getGradientStyleForFuelDate(days) {
  if (days === null || days === undefined) {
    return { backgroundColor: "#e0e0e0", color: "#333" };
  }

  if (days < 0) {
    // Overdue: Red gradient (more red as days overdue increase)
    const intensityDays = Math.min(Math.abs(days), 10);
    const intensity = intensityDays / 10;
    const red = Math.round(255);
    const green = Math.round(200 * (1 - intensity));
    const blue = Math.round(200 * (1 - intensity));
    return {
      backgroundColor: `rgb(${red}, ${green}, ${blue})`,
      color: intensity > 0.6 ? "#fff" : "#000",
    };
  } else if (days > 0) {
    // Remaining days: Green gradient (more green as days remaining increase)
    const intensityDays = Math.min(days, 30);
    const intensity = intensityDays / 30;
    const red = Math.round(200 * (1 - intensity));
    const green = Math.round(255);
    const blue = Math.round(200 * (1 - intensity));
    return {
      backgroundColor: `rgb(${red}, ${green}, ${blue})`,
      color: intensity > 0.5 ? "#fff" : "#000",
    };
  } else {
    // Today: Yellow/Orange
    return {
      backgroundColor: "#ffbe0b",
      color: "#000",
    };
  }
}

function updateEventCards(sites) {
  // Show all unique sitelabel values
  const uniqueLabels = [
    ...new Set(sites.map((s) => s.sitelabel).filter(Boolean)),
  ];

  // Show sites that have VVVIP in sitelabel
  const sitesWithVVVIP = sites.filter(
    (s) => s.sitelabel && s.sitelabel.toUpperCase().includes("VVVIP"),
  );

  const vvvipSites = sites.filter((s) => isVVVIPSite(s));

  document.getElementById("vvvipCount").textContent = vvvipSites.length;
}

window.showVVVIPModal = function showVVVIPModal() {
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

      const gradientStyle = getGradientStyleForFuelDate(site.days);
      const siteName = document.createElement("td");
      siteName.textContent = site.sitename;

      const fuelDateCell = document.createElement("td");
      fuelDateCell.textContent = site.nextfuelingplan || "N/A";
      fuelDateCell.style.backgroundColor = gradientStyle.backgroundColor;
      fuelDateCell.style.color = gradientStyle.color;
      fuelDateCell.style.padding = "8px";
      fuelDateCell.style.fontWeight = "500";

      const siteLabel = document.createElement("td");
      siteLabel.textContent = site.sitelabel || "N/A";

      tr.appendChild(siteName);
      tr.appendChild(fuelDateCell);
      tr.appendChild(siteLabel);
      tbody.appendChild(tr);
    });
  }

  modal.style.display = "block";
};

window.closeVVVIPModal = function closeVVVIPModal() {
  const modal = document.getElementById("vvvipModal");
  modal.style.display = "none";
};

window.addEventListener("click", (event) => {
  const vvvipModal = document.getElementById("vvvipModal");

  if (event.target === vvvipModal) {
    closeVVVIPModal();
  }
});

window.selectRegion = function selectRegion(region) {
  selectedRegion = region;

  // Save last selected region for remember-me restoration
  localStorage.setItem("last_selected_region", region);

  // Update active tab styling
  document.querySelectorAll(".region-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  if (event && event.target) {
    event.target.classList.add("active");
  }

  // Update event cards visibility based on region
  const eventCardsContainer = document.getElementById("eventCardsContainer");
  if (region === "East") {
    eventCardsContainer.style.display = "none";
  } else {
    eventCardsContainer.style.display = "flex";
  }

  // Reload dashboard with new region filter
  loadDashboard();
};

function isInSelectedRegion(site) {
  if (!site.regionname) {
    return false;
  }
  const regionLower = site.regionname.toLowerCase().trim();
  if (selectedRegion === "CER") {
    return regionLower.includes("central") || regionLower.includes("east");
  }
  return regionLower.includes(selectedRegion.toLowerCase());
}

function startDashboard() {
  startDashboardAsync();
}

async function backgroundSyncData() {
  try {
    // Check network connectivity before syncing
    if (!navigator.onLine) {
      return;
    }

    // Silently fetch latest CSV data
    let rawData = [];
    try {
      rawData = await Promise.race([
        fetchCSV(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("CSV fetch timeout")), 8000),
        ),
      ]);
    } catch (csvErr) {
      return;
    }

    if (rawData.length === 0) {
      return;
    }

    // Filter and validate sites
    const newSitesData = filterAndValidateSites(rawData);

    // Check if data has changed compared to current sitesData
    const dataChanged = hasDataChanged(sitesData, newSitesData);

    if (dataChanged) {
      sitesData = newSitesData;

      // Soft update: only update metrics and tables, not the map
      try {
        updateMetrics(sitesData);
        populateDueTable(sitesData);
        updateEventCards(sitesData);
        addMarkersToMap(sitesData);
      } catch (uiErr) {
        // Silent fail - don't disrupt the application
      }
    }
  } catch (error) {
    // Silent fail - don't disrupt the application
  }
}

function hasDataChanged(oldData, newData) {
  // Check if the number of sites changed
  if (oldData.length !== newData.length) {
    return true;
  }

  // Check if any critical fields changed (status, fuel date, etc)
  for (let i = 0; i < oldData.length; i++) {
    const oldSite = oldData[i];
    const newSite = newData.find((s) => s.sitename === oldSite.sitename);

    if (!newSite) {
      return true; // Site was removed
    }

    // Check if critical fields changed
    if (
      oldSite.status !== newSite.status ||
      oldSite.days !== newSite.days ||
      oldSite.nextfuelingplan !== newSite.nextfuelingplan ||
      oldSite.lastfuelingdate !== newSite.lastfuelingdate
    ) {
      return true; // Critical data changed
    }
  }

  // Check for new sites
  for (const newSite of newData) {
    if (!oldData.find((s) => s.sitename === newSite.sitename)) {
      return true; // New site added
    }
  }

  return false; // No changes detected
}

// Invoicing Module Functions
let invoiceData = [];
let filteredInvoiceData = [];

window.showInvoiceModal = async function showInvoiceModal() {
  try {
    const modal = document.getElementById("invoiceModal");
    if (!modal) {
      console.error("Invoice modal not found");
      return;
    }

    modal.style.display = "flex";
    await loadInvoiceData();
    window.applyInvoiceFilters();
  } catch (error) {
    console.error("Error showing invoice modal:", error);
  }
};

window.closeInvoiceModal = function closeInvoiceModal() {
  document.getElementById("invoiceModal").style.display = "none";
};

// Helper function to parse dates from various formats and return as YYYY-MM-DD string
// Handles Google Sheets text dates, Excel serial numbers, and common formats
// This is used in both parseInvoiceCSV and applyInvoiceFilters for consistency
function parseDateToString(dateStr) {
  if (!dateStr && dateStr !== 0) return null;

  // Convert to string if needed
  let str = String(dateStr).trim();
  if (!str) return null;

  // Try ISO format first (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // Try numeric Excel serial date (Google Sheets may export as number)
  const numValue = Number(str);
  if (!isNaN(numValue) && numValue > 0) {
    // Excel serial dates start at 1 (Jan 1, 1900)
    if (numValue > 30000 && numValue < 50000) {
      const excelDate = new Date((numValue - 25569) * 86400 * 1000); // Convert Excel serial to JS date
      if (!isNaN(excelDate.getTime())) {
        const year = excelDate.getFullYear();
        const month = String(excelDate.getMonth() + 1).padStart(2, "0");
        const day = String(excelDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
  }

  // Try slash-separated format (MM/DD/YYYY or DD/MM/YYYY)
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const first = parseInt(slashMatch[1]);
    const second = parseInt(slashMatch[2]);
    let year = parseInt(slashMatch[3]);

    // Handle 2-digit years
    if (year < 100) {
      year = year < 30 ? 2000 + year : 1900 + year;
    }

    let month, day;

    // If first part > 12, it must be day (DD/MM format)
    if (first > 12) {
      day = first;
      month = second;
    }
    // If second part > 12, it must be day (MM/DD format)
    else if (second > 12) {
      month = first;
      day = second;
    }
    // Both could be valid for either format, assume DD/MM (international format)
    else {
      day = first;
      month = second;
    }

    // Validate
    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      year >= 1900 &&
      year <= 2100
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Try dash-separated format (DD-MM-YYYY or MM-DD-YYYY)
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dashMatch) {
    const first = parseInt(dashMatch[1]);
    const second = parseInt(dashMatch[2]);
    let year = parseInt(dashMatch[3]);

    if (year < 100) {
      year = year < 30 ? 2000 + year : 1900 + year;
    }

    let month, day;

    // If first part > 12, it must be day (DD-MM format)
    if (first > 12) {
      day = first;
      month = second;
    }
    // If second part > 12, it must be day (MM-DD format)
    else if (second > 12) {
      month = first;
      day = second;
    }
    // Ambiguous - assume DD-MM (international format)
    else {
      day = first;
      month = second;
    }

    // Validate
    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      year >= 1900 &&
      year <= 2100
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Try JavaScript's built-in Date parser
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Fall through
  }

  return null;
}

async function loadInvoiceData() {
  console.log("Loading invoice data from:", INVOICE_CSV_URL);
  const CORS_PROXIES = [
    "https://corsproxy.io/?",
    "https://api.codetabs.com/v1/proxy?quest=",
  ];

  try {
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      try {
        let proxyUrl;
        if (CORS_PROXIES[i].includes("?")) {
          proxyUrl = CORS_PROXIES[i] + INVOICE_CSV_URL;
        } else {
          proxyUrl = CORS_PROXIES[i] + encodeURIComponent(INVOICE_CSV_URL);
        }

        console.log("Trying proxy:", CORS_PROXIES[i]);

        try {
          const fetchPromise = fetch(proxyUrl, {
            method: "GET",
            headers: {
              Accept: "text/plain",
            },
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("timeout")), 8000);
          });

          try {
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (response.ok) {
              const csvText = await response.text();
              console.log("CSV fetched successfully, length:", csvText.length);
              if (csvText.trim()) {
                invoiceData = parseInvoiceCSV(csvText);
                console.log("Invoice data loaded:", invoiceData.length, "rows");
                return;
              }
            }
          } catch (fetchError) {
            if (fetchError.message !== "timeout") {
              console.log("Proxy fetch failed:", fetchError.message);
            }
          }
        } catch (error) {
          console.debug("Proxy error:", error.message);
        }
      } catch (proxyError) {
        console.log("Proxy setup failed:", proxyError.message);
      }
    }

    try {
      console.log("Trying direct fetch (no proxy)");

      const fetchPromise = fetch(INVOICE_CSV_URL, {
        method: "GET",
        mode: "cors",
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), 8000);
      });

      try {
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (response.ok) {
          const csvText = await response.text();
          console.log("CSV fetched directly, length:", csvText.length);
          if (csvText.trim()) {
            invoiceData = parseInvoiceCSV(csvText);
            console.log("Invoice data loaded:", invoiceData.length, "rows");
            return;
          }
        } else {
          console.debug("Direct fetch failed with status:", response.status);
        }
      } catch (fetchError) {
        if (fetchError.message !== "timeout") {
          console.debug("Direct fetch error:", fetchError.message);
        }
      }
    } catch (error) {
      console.debug("Invoice data loading fallback:", error.message);
    }
  } catch (error) {
    console.debug("Invoice loading outer catch:", error.message);
  }

  console.warn("No invoice data loaded, invoiceData set to empty array");
  invoiceData = [];
}

function parseInvoiceCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const headerLower = headers.map((h) => h.toLowerCase());
  const data = [];

  // Find column indices - handle different possible header names
  const siteNameIndex = headerLower.findIndex(
    (h) => h === "sitename" || h === "site name" || h === "site_name",
  );
  const regionIndex = headerLower.findIndex((h) => h === "region");
  const dateIndex = headerLower.findIndex(
    (h) =>
      h === "lastfuelingdate" ||
      h === "last fueling date" ||
      h === "last_fueling_date",
  );
  const qtyIndex = headerLower.findIndex(
    (h) =>
      h === "lastfuelingqty" ||
      h === "lastfuelingquantity" ||
      h === "last fueling qty" ||
      h === "last fueling quantity",
  );

  console.log("Invoice CSV Headers:", headers);
  console.log(
    "Column indices - Site:",
    siteNameIndex,
    "Region:",
    regionIndex,
    "Date:",
    dateIndex,
    "Qty:",
    qtyIndex,
  );

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const sitename =
      siteNameIndex >= 0 ? (values[siteNameIndex] || "").trim() : "";
    const region = regionIndex >= 0 ? (values[regionIndex] || "").trim() : "";
    const lastfuelingdate =
      dateIndex >= 0 ? (values[dateIndex] || "").trim() : "";
    const lastfuelingqty = qtyIndex >= 0 ? (values[qtyIndex] || "").trim() : "";

    // Validate required fields
    if (sitename && lastfuelingdate && lastfuelingqty) {
      // Use the same robust date parsing as applyInvoiceFilters
      const parsedDate = parseDateToString(lastfuelingdate);
      const quantity = parseFloat(lastfuelingqty);

      // Only include if we have a valid date and valid positive quantity
      if (parsedDate && !isNaN(quantity) && quantity > 0) {
        data.push({
          sitename,
          region,
          lastfuelingdate,
          lastfuelingquantity: quantity,
        });
      }
    }
  }

  console.log("Parsed invoice data:", data.length, "rows");
  // Log comprehensive debugging info
  if (data.length > 0) {
    console.log("First row:", data[0]);
    console.log("Last row:", data[data.length - 1]);

    // Sample all rows to show date format
    const maxToLog = Math.min(20, data.length);
    console.log(`First ${maxToLog} rows with dates:`);
    for (let i = 0; i < maxToLog; i++) {
      const row = data[i];
      console.log(
        `  [${i}] ${row.sitename} | Date: "${row.lastfuelingdate}" | Qty: ${row.lastfuelingquantity}`,
      );
    }

    // Count rows by month
    const monthCounts = {};
    const noDateCount = { empty: 0, null: 0 };
    data.forEach((row) => {
      const dateStr = row.lastfuelingdate;
      if (!dateStr) {
        noDateCount.empty++;
        return;
      }

      // Extract month from various formats
      let month = null;
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        month = dateStr.substring(5, 7);
      } else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
        // DD/MM/YYYY
        month = dateStr.substring(3, 5);
      } else if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) {
        month = dateStr.substring(3, 5);
      }

      if (month) {
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    });
    console.log("Rows with dates by month:", monthCounts);
    console.log("Rows with missing dates:", noDateCount);
  }
  return data;
}

window.applyInvoiceFilters = function applyInvoiceFilters() {
  const startDate = document.getElementById("invoiceStartDate").value;
  const endDate = document.getElementById("invoiceEndDate").value;
  const region = document.getElementById("invoiceRegion").value;

  console.log(
    "Applying filters - Start:",
    startDate,
    "End:",
    endDate,
    "Region:",
    region,
  );
  console.log("Total invoice data rows:", invoiceData.length);

  // Log sample raw data to understand the structure
  if (invoiceData.length > 0) {
    console.log("First 3 raw invoice rows:");
    invoiceData.slice(0, 3).forEach((row, i) => {
      console.log(
        `  [${i}] ${row.sitename} | ${row.lastfuelingdate} | ${row.region} | ${row.lastfuelingquantity}`,
      );
    });
  }

  filteredInvoiceData = invoiceData.filter((row) => {
    // Apply region filter if selected
    if (region && region !== "") {
      const rowRegion = row.region.toLowerCase();
      const filterRegion = region.toLowerCase();

      if (filterRegion === "cer") {
        if (!rowRegion.includes("central") && !rowRegion.includes("east")) {
          return false;
        }
      } else {
        if (!rowRegion.includes(filterRegion)) {
          return false;
        }
      }
    }

    // If no date filters, include all rows (capture all Column AE data)
    if (!startDate && !endDate) {
      return true;
    }

    // Parse the row date - only matters when date filter is active
    const rowDateStr = parseDateToString(row.lastfuelingdate);

    // If we can't parse the date and date filtering is active, still try to include it
    // (better to show data that might be valid than hide it)
    if (!rowDateStr) {
      // When date filtering is active but we can't parse, include anyway if date field is non-empty
      if (row.lastfuelingdate) {
        console.debug(
          `Could not fully parse date "${row.lastfuelingdate}" for ${row.sitename}, but including anyway`,
        );
        return true;
      }
      return false;
    }

    // Log first 10 parsed dates for debugging
    const rowIndex = invoiceData.indexOf(row);
    if (
      rowIndex < 10 ||
      (startDate &&
        rowDateStr >= startDate &&
        endDate &&
        rowDateStr <= endDate &&
        rowIndex < 20)
    ) {
      console.log(
        `[${rowIndex}] Site=${row.sitename}, CSV="${row.lastfuelingdate}", Parsed="${rowDateStr}", InRange=${!startDate || rowDateStr >= startDate} && ${!endDate || rowDateStr <= endDate}`,
      );
    }

    // Apply date range filters with parsed date
    if (startDate && rowDateStr < startDate) {
      return false;
    }

    if (endDate && rowDateStr > endDate) {
      return false;
    }

    return true;
  });

  console.log(
    `Filter results: ${filteredInvoiceData.length} rows (from ${invoiceData.length} total)`,
  );
  console.log(
    `Filters applied - Start: "${startDate}", End: "${endDate}", Region: "${region}"`,
  );

  // Debug: analyze why rows are excluded
  if (invoiceData.length > filteredInvoiceData.length) {
    const excluded = [];
    invoiceData.forEach((row) => {
      const isInFiltered = filteredInvoiceData.some(
        (fr) => fr.sitename === row.sitename,
      );
      if (!isInFiltered) {
        const dateStr = parseDateToString(row.lastfuelingdate);
        excluded.push({
          site: row.sitename,
          rawDate: row.lastfuelingdate,
          parsedDate: dateStr,
          region: row.region,
        });
      }
    });
    console.log(`Excluded ${excluded.length} rows. First 10 excluded:`);
    excluded.slice(0, 10).forEach((row) => {
      console.log(
        `  ${row.site} | Raw: "${row.rawDate}" | Parsed: "${row.parsedDate}" | Region: ${row.region}`,
      );
    });
  }

  if (filteredInvoiceData.length > 0 && filteredInvoiceData.length <= 50) {
    console.log(`All ${filteredInvoiceData.length} matching rows:`);
    filteredInvoiceData.forEach((row, i) => {
      const parsed = parseDateToString(row.lastfuelingdate);
      console.log(
        `  [${i}] ${row.sitename} | ${row.lastfuelingdate} (→ ${parsed}) | ${row.region}`,
      );
    });
  }

  displayInvoiceTable();
  updateInvoiceSummary();
};

function displayInvoiceTable() {
  const tbody = document.getElementById("invoiceTableBody");
  tbody.innerHTML = "";

  filteredInvoiceData.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHTML(row.sitename)}</td>
      <td>${escapeHTML(row.region)}</td>
      <td>${escapeHTML(row.lastfuelingdate)}</td>
      <td>${row.lastfuelingquantity.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateInvoiceSummary() {
  const rowCount = filteredInvoiceData.length;
  const totalQty = filteredInvoiceData.reduce(
    (sum, row) => sum + row.lastfuelingquantity,
    0,
  );

  document.getElementById("invoiceRowCount").textContent = rowCount;
  document.getElementById("invoiceTotalQty").textContent = totalQty.toFixed(2);
}

window.downloadInvoiceExcel = function downloadInvoiceExcel() {
  const startDate = document.getElementById("invoiceStartDate").value || "All";
  const endDate = document.getElementById("invoiceEndDate").value || "All";
  const region = document.getElementById("invoiceRegion").value || "All";

  const filename = `invoice_${startDate}_to_${endDate}_${region}.xlsx`;

  const wsData = [
    ["Site Name", "Region", "Last Fueling Date", "Last Fueling Qty"],
    ...filteredInvoiceData.map((row) => [
      row.sitename,
      row.region,
      row.lastfuelingdate,
      row.lastfuelingquantity,
    ]),
    [],
    ["Total Rows:", filteredInvoiceData.length],
    [
      "Total Quantity:",
      filteredInvoiceData
        .reduce((sum, row) => sum + row.lastfuelingquantity, 0)
        .toFixed(2),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoice");

  // Set column widths
  ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];

  XLSX.writeFile(wb, filename);
};

export {};
