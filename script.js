const CSV_API_URL = "/api/fetch-csv";

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

// Supabase configuration - using environment variables
const VITE_SUPABASE_URL = "https://qpnpqudrrrzgvfwdkljo.supabase.co";
const VITE_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbnBxdWRycnJ6Z3Zmd2RrbGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDQ1MjcsImV4cCI6MjA3NDEyMDUyN30.v4MAx44YMTq7hYufn5IlIWCu_SGrKulZIHXwCY999WE";

let supabaseClient = null;
let currentSessionId = null;
let activeUsersIntervalId = null;
let updateActivityIntervalId = null;

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
let csvDataMigrated = false;

// Load dashboard on page load
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
});

// Clean up active user when page is closed or navigated away
window.addEventListener("beforeunload", () => {
  removeActiveUser();
  if (updateActivityIntervalId) clearInterval(updateActivityIntervalId);
  if (activeUsersIntervalId) clearInterval(activeUsersIntervalId);
});

function initSupabaseClient() {
  // Return immediately if client is already initialized
  if (supabaseClient) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    if (!window.supabase) {
      // Load Supabase library if not already loaded
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.0.0/dist/umd/supabase.min.js";
      script.onload = function () {
        try {
          supabaseClient = window.supabase.createClient(
            VITE_SUPABASE_URL,
            VITE_SUPABASE_KEY,
          );
          console.log("✓ Supabase client initialized");
          resolve();
        } catch (err) {
          console.warn("Could not initialize Supabase client:", err.message);
          resolve();
        }
      };
      script.onerror = function () {
        console.warn("Could not load Supabase library");
        resolve();
      };
      document.head.appendChild(script);
    } else {
      try {
        supabaseClient = window.supabase.createClient(
          VITE_SUPABASE_URL,
          VITE_SUPABASE_KEY,
        );
        console.log("✓ Supabase client initialized");
        resolve();
      } catch (err) {
        console.warn("Could not initialize Supabase client:", err.message);
        resolve();
      }
    }
  });
}

async function registerActiveUser(username) {
  if (!supabaseClient) {
    await initSupabaseClient();
  }

  // Get or create session ID
  currentSessionId = getOrCreateSessionId();

  // Use URL username if available, otherwise use parameter
  const finalUsername = urlUsername !== "Guest" ? urlUsername : username;

  try {
    // Use upsert to insert or update existing session
    const { error } = await supabaseClient.from("active_users").upsert(
      {
        username: finalUsername,
        session_id: currentSessionId,
        last_activity: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );

    if (error) {
      console.warn("⚠ Active user tracking not available:", error.message);
      // Gracefully continue even if active user tracking fails
      return;
    }

    console.log("✓ User registered as active with session:", currentSessionId);
    updateActiveUsersCount();

    // Update activity every 20 seconds
    if (updateActivityIntervalId) clearInterval(updateActivityIntervalId);
    updateActivityIntervalId = setInterval(updateUserActivity, 20000);

    // Fetch active users count every 10 seconds
    if (activeUsersIntervalId) clearInterval(activeUsersIntervalId);
    activeUsersIntervalId = setInterval(updateActiveUsersCount, 10000);
  } catch (error) {
    console.warn("⚠ Active user tracking unavailable:", error.message);
  }
}

async function updateUserActivity() {
  if (!supabaseClient || !currentSessionId) return;

  try {
    await supabaseClient
      .from("active_users")
      .update({ last_activity: new Date().toISOString() })
      .eq("session_id", currentSessionId)
      .catch((err) => null); // Silently fail if table doesn't exist
  } catch (error) {
    // Silently fail - activity tracking is optional
  }
}

async function updateActiveUsersCount() {
  if (!supabaseClient) return;

  try {
    // Call Supabase RPC function to get active users count (within last 2 minutes)
    const { data, error } = await supabaseClient.rpc("count_active_users");

    if (error) {
      // Fallback: directly count from table
      await fallbackCountActiveUsers();
      return;
    }

    const countElement = document.getElementById("activeUsersCount");
    if (countElement && data !== null) {
      countElement.textContent = data || 0;
      console.log("✓ Active users count updated:", data);
    }
  } catch (error) {
    // Silently fail for active user count
    await fallbackCountActiveUsers();
  }
}

async function fallbackCountActiveUsers() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("active_users")
      .select("*", { count: "exact", head: true })
      .gt("last_activity", new Date(Date.now() - 2 * 60 * 1000).toISOString());

    if (error) {
      // Active user count not critical, gracefully continue
      const countElement = document.getElementById("activeUsersCount");
      if (countElement) {
        countElement.textContent = "0";
      }
      return;
    }

    const countElement = document.getElementById("activeUsersCount");
    if (countElement) {
      countElement.textContent = data?.length || 0;
      console.log("✓ Active users count:", data?.length || 0);
    }
  } catch (error) {
    // Silently fail
  }
}

async function diagnoseSupabaseSetup() {
  console.group("🔍 Supabase Diagnostic Report");

  // Check 1: Supabase client
  console.log("1. Supabase Client Status:");
  if (supabaseClient) {
    console.log("✓ Supabase client initialized");
  } else {
    console.error("❌ Supabase client NOT initialized");
    return;
  }

  // Check 2: Table exists
  console.log("\n2. Checking active_users table...");
  try {
    const { count, error } = await supabaseClient
      .from("active_users")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("❌ Table error:", error.message);
    } else {
      console.log("✓ active_users table exists, current records:", count);
    }
  } catch (e) {
    console.error("❌ Exception checking table:", e.message);
  }

  // Check 3: RPC function exists
  console.log("\n3. Checking count_active_users RPC function...");
  try {
    const { data, error } = await supabaseClient.rpc("count_active_users");
    if (error) {
      console.error("❌ RPC function error:", error.code, error.message);
    } else {
      console.log("✓ RPC function works, returned:", data);
    }
  } catch (e) {
    console.error("❌ Exception calling RPC:", e.message);
  }

  // Check 4: Last activity data
  console.log("\n4. Recent active users (last 10 records)...");
  try {
    const { data, error } = await supabaseClient
      .from("active_users")
      .select("*")
      .order("last_activity", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Query error:", error.message);
    } else {
      console.table(data);
    }
  } catch (e) {
    console.error("❌ Exception querying users:", e.message);
  }

  console.groupEnd();
}

async function removeActiveUser() {
  if (!supabaseClient || !currentSessionId) return;

  try {
    await supabaseClient
      .from("active_users")
      .delete()
      .eq("session_id", currentSessionId)
      .catch((err) => null); // Silently fail if table doesn't exist

    currentSessionId = null;
  } catch (error) {
    // Silently fail on logout
  }
}

// Test Supabase REST endpoints
async function testSupabaseRESTEndpoints() {
  console.group("🧪 Testing Supabase REST Endpoints");

  if (!supabaseClient) {
    await initSupabaseClient();
  }

  if (!supabaseClient) {
    console.error("❌ Supabase client not initialized");
    console.groupEnd();
    return;
  }

  const apiKey = VITE_SUPABASE_KEY;
  const baseUrl = VITE_SUPABASE_URL;

  // Test 1: Query active_users table via REST
  console.log("\n📋 Test 1: Query active_users table");
  try {
    const response = await fetch(
      `${baseUrl}/rest/v1/active_users?select=*&limit=5`,
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    if (response.ok) {
      console.log("✅ REST endpoint working. Records:", data.length);
      console.table(data);
    } else {
      console.error(`❌ REST error (${response.status}):`, data);
    }
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
  }

  // Test 2: Query remember_me_tokens table via REST
  console.log("\n📋 Test 2: Query remember_me_tokens table");
  try {
    const response = await fetch(
      `${baseUrl}/rest/v1/remember_me_tokens?select=*&limit=5`,
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    if (response.ok) {
      console.log("✅ REST endpoint working. Records:", data.length);
      console.table(data);
    } else {
      console.error(`❌ REST error (${response.status}):`, data);
    }
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
  }

  // Test 3: Call count_active_users RPC function
  console.log("\n📋 Test 3: Call count_active_users RPC");
  try {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/count_active_users`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (response.ok) {
      console.log("✅ RPC function working. Active users:", data);
    } else {
      console.error(`❌ RPC error (${response.status}):`, data);
    }
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
  }

  // Test 4: Insert test record into active_users
  console.log("\n📋 Test 4: Insert test record (via SDK)");
  try {
    const testSession = "test_" + Date.now();
    const { data, error } = await supabaseClient.from("active_users").insert({
      session_id: testSession,
      username: "test_user",
      last_activity: new Date().toISOString(),
    });

    if (error) {
      console.error("❌ Insert error:", error.message);
    } else {
      console.log("✅ Insert successful. Data:", data);

      // Clean up test record
      await supabaseClient
        .from("active_users")
        .delete()
        .eq("session_id", testSession)
        .catch((e) => console.error("Cleanup error:", e));
    }
  } catch (err) {
    console.error("❌ Exception:", err.message);
  }

  console.log("\n✅ Testing complete");
  console.groupEnd();
}

async function initializeApp() {
  // Initialize Supabase client
  await initSupabaseClient();

  // Check if user is already logged in (session)
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

  if (isLoggedIn) {
    const username = sessionStorage.getItem("username") || "Aces@MSD";
    showDashboard();
    registerActiveUser(username);
    startDashboardAsync();
  } else {
    // Show login page
    showLoginPage();
    setupLoginForm();
  }
}

function showLoginPage() {
  const loginPage = document.getElementById("loginPage");
  loginPage.classList.add("show");
  document.getElementById("dashboardPage").style.display = "none";
}

function showDashboard() {
  document.getElementById("loginPage").classList.remove("show");
  document.getElementById("dashboardPage").style.display = "grid";
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
      console.error("Error during login:", error);
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
    headerIntervalId = setInterval(updateHeaderDate, 1000);

    refreshIntervalId = setInterval(() => {
      console.log("Auto-refreshing dashboard...");
      loadDashboard();
    }, 120000);

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchSite(searchInput.value);
        }
      });
    }

    const modal = document.getElementById("searchModal");
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeSearchModal();
      }
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

window.handleLogout = function handleLogout() {
  // Clear login status
  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("username");

  // Remove user from active users and clear intervals
  removeActiveUser();
  if (updateActivityIntervalId) clearInterval(updateActivityIntervalId);
  if (activeUsersIntervalId) clearInterval(activeUsersIntervalId);
  if (headerIntervalId) clearInterval(headerIntervalId);
  if (refreshIntervalId) clearInterval(refreshIntervalId);

  // Clear pulsing intervals
  pulsingIntervals.forEach((interval) => clearInterval(interval));
  pulsingIntervals = [];

  // Reset dashboard state
  dashboardInitialized = false;
  csvDataMigrated = false;

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

  // Try API endpoint first (for servers with backend like Fly.dev)
  try {
    console.log("Fetching CSV from API endpoint: /api/fetch-csv");

    const response = await fetch("/api/fetch-csv", {
      method: "GET",
      headers: {
        Accept: "text/csv",
      },
    });

    if (response.ok) {
      const csvText = await response.text();
      if (csvText.trim()) {
        console.log(
          "CSV fetched successfully from API endpoint, length:",
          csvText.length,
        );
        const parsed = parseCSV(csvText);
        console.log("Parsed CSV rows:", parsed.length);
        return parsed;
      }
    } else {
      console.warn(
        `API endpoint returned status ${response.status}, trying alternatives...`,
      );
    }
  } catch (error) {
    console.warn("API endpoint not available, trying alternatives...");
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

      console.log(
        `Trying CORS proxy ${i + 1}/${CORS_PROXIES.length}: ${CORS_PROXIES[i]}`,
      );

      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          Accept: "text/plain",
        },
      });

      if (response.ok) {
        const csvText = await response.text();

        if (csvText.trim()) {
          console.log(
            `CSV fetched successfully from CORS proxy ${i + 1}, length:`,
            csvText.length,
          );
          const parsed = parseCSV(csvText);
          console.log("Parsed CSV rows:", parsed.length);
          return parsed;
        }
      } else {
        console.warn(`CORS proxy ${i + 1} returned status ${response.status}`);
      }
    } catch (proxyError) {
      console.warn(`CORS proxy ${i + 1} error:`, proxyError.message);
    }
  }

  // Last resort: try direct Google Sheets fetch
  try {
    console.log("Attempting to fetch CSV directly from Google Sheets...");
    const response = await fetch(CSV_URL, {
      method: "GET",
      mode: "cors",
    });

    if (response.ok) {
      const csvText = await response.text();
      if (csvText.trim()) {
        console.log(
          "CSV fetched successfully from Google Sheets, length:",
          csvText.length,
        );
        const parsed = parseCSV(csvText);
        console.log("Parsed CSV rows:", parsed.length);
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Direct Google Sheets fetch failed:", error.message);
  }

  console.error(
    "CSV fetch failed with all methods. Using empty data array as fallback.",
  );
  return [];
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  console.log("CSV Headers (Full List):", headers);
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

  // Check for region column
  const regionIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("region"),
  );
  console.log(
    "Region column index:",
    regionIndex,
    "Header:",
    headers[regionIndex],
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
  if (data.length > 0) {
    console.log("Column D (Region) sample value:", data[0][headers[3]?.toLowerCase()] || "NOT FOUND");
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

  // Try DD/MM/YYYY format
  const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  let match = dateStr.match(ddmmyyyyRegex);

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validate month and day
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn(`Invalid date values: ${dateStr} (day=${day}, month=${month})`);
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
      console.warn(`Invalid date values (MM/DD/YYYY): ${dateStr} (month=${month}, day=${day})`);
      return null;
    }

    const monthStr = String(month).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");

    return `${year}-${monthStr}-${dayStr}`;
  }

  console.warn(`Could not parse date: ${dateStr}`);
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

    // Create circle marker for this site
    const circleMarker = L.circleMarker([site.lat, site.lng], {
      radius: 8,
      fillColor: color,
      color: "white",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
      siteData: {
        siteName: site.sitename,
        status: site.status,
        days: site.days,
        nextFuelingPlan: site.nextfuelingplan,
        statusLabel: getStatusLabel(site.status),
      },
    });

    // Add to markers layer
    circleMarker.addTo(markersLayer);

    // Store marker reference
    circleMarker.siteData = {
      siteName: site.sitename,
      status: site.status,
      days: site.days,
      nextFuelingPlan: site.nextfuelingplan,
      statusLabel: getStatusLabel(site.status),
    };
    markers.push(circleMarker);

    // Store marker info for interaction
    siteMap[site.sitename] = {
      marker: circleMarker,
      site: site,
      coords: [site.lat, site.lng],
    };

    // Add popup on click
    circleMarker.on("click", () => {
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

      circleMarker.bindPopup(popupContent).openPopup();
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
  console.log("Starting loadDashboard...");
  const rawData = await fetchCSV();
  console.log("Raw data from CSV:", rawData.length, "rows");

  sitesData = filterAndValidateSites(rawData);
  console.log("Filtered sites data:", sitesData.length, "sites");

  if (sitesData.length === 0) {
    console.warn("No sites data available after filtering");
  }

  // Save CSV fuel data to Supabase only once per session to prevent duplicates
  if (!csvDataMigrated) {
    console.log("📊 First load - migrating CSV data to Supabase...");
    await saveCsvFuelDataToSupabase(rawData);
    csvDataMigrated = true;
  } else {
    console.log("✅ CSV data already migrated in this session - skipping migration");
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

window.searchSite = function searchSite(siteName) {
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
      console.error("XLSX library not available");
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
    console.error("Error downloading Excel:", error);
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
    "COW08",
    "COW056",
    "COW801",
    "COW805",
    "COW726",
    "COW775",
    "COW741",
    "COW823",
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

window.showCamelModal = function showCamelModal() {
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

      const gradientStyle = getGradientStyleForFuelDate(site.days);
      const siteName = document.createElement("td");
      siteName.textContent = site.sitename;

      const fuelDateCell = document.createElement("td");
      fuelDateCell.textContent = site.nextfuelingplan || "N/A";
      fuelDateCell.style.backgroundColor = gradientStyle.backgroundColor;
      fuelDateCell.style.color = gradientStyle.color;
      fuelDateCell.style.padding = "8px";
      fuelDateCell.style.fontWeight = "500";

      tr.appendChild(siteName);
      tr.appendChild(fuelDateCell);
      tbody.appendChild(tr);
    });
  }

  modal.style.display = "block";
};

window.closeCamelModal = function closeCamelModal() {
  const modal = document.getElementById("camelModal");
  modal.style.display = "none";
};

window.showMDLModal = function showMDLModal() {
  const modal = document.getElementById("mdlModal");
  const tbody = document.getElementById("mdlTableBody");
  tbody.innerHTML = "";

  const mdlBeastSites = [
    "COW017",
    "COW08",
    "COW056",
    "COW801",
    "COW805",
    "COW726",
    "COW775",
    "COW741",
    "COW823",
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

      const gradientStyle = getGradientStyleForFuelDate(site.days);
      const siteName = document.createElement("td");
      siteName.textContent = site.sitename;

      const fuelDateCell = document.createElement("td");
      fuelDateCell.textContent = site.nextfuelingplan || "N/A";
      fuelDateCell.style.backgroundColor = gradientStyle.backgroundColor;
      fuelDateCell.style.color = gradientStyle.color;
      fuelDateCell.style.padding = "8px";
      fuelDateCell.style.fontWeight = "500";

      tr.appendChild(siteName);
      tr.appendChild(fuelDateCell);
      tbody.appendChild(tr);
    });
  }

  modal.style.display = "block";
};

window.closeMDLModal = function closeMDLModal() {
  const modal = document.getElementById("mdlModal");
  modal.style.display = "none";
};

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

function selectRegion(region) {
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
}

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

// ============================================
// Fuel Quantity & Invoice Management
// ============================================

let fuelQuantitiesData = [];

window.openInvoiceModal = function openInvoiceModal() {
  const modal = document.getElementById("invoiceModal");
  if (modal) {
    modal.style.display = "block";
  }
};

window.closeInvoiceModal = function closeInvoiceModal() {
  const modal = document.getElementById("invoiceModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.addEventListener("click", (event) => {
  const invoiceModal = document.getElementById("invoiceModal");
  if (event.target === invoiceModal) {
    closeInvoiceModal();
  }
});

window.loadInvoiceDataByDateRange = async function loadInvoiceDataByDateRange() {
  const startDateInput = document.getElementById("invoiceStartDate");
  const endDateInput = document.getElementById("invoiceEndDate");
  const regionSelect = document.getElementById("invoiceRegion");
  const statusDiv = document.getElementById("invoiceStatus");

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const selectedRegionFilter = regionSelect.value;

  if (!startDate || !endDate) {
    statusDiv.textContent = "ℹ️ Please select both start and end dates";
    statusDiv.className = "invoice-status info";
    document.getElementById("invoicePreviewBody").innerHTML =
      '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">Select dates to view records</td></tr>';
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    statusDiv.textContent = "❌ Start date must be before end date";
    statusDiv.className = "invoice-status error";
    return;
  }

  statusDiv.textContent = "⏳ Loading records...";
  statusDiv.className = "invoice-status";

  try {
    const filteredRecords = await fetchFuelQuantitiesByDateRange(
      startDate,
      endDate,
      selectedRegionFilter
    );

    if (filteredRecords.length === 0) {
      statusDiv.textContent = "ℹ️ No records found for selected date range and region";
      statusDiv.className = "invoice-status info";
      document.getElementById("invoicePreviewBody").innerHTML =
        '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">No records in this date range</td></tr>';
      return;
    }

    // Deduplicate records based on sitename + refilled_date combination
    const uniqueRecords = [];
    const seen = new Set();

    filteredRecords.forEach((record) => {
      const key = `${record.sitename}|${record.refilled_date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecords.push(record);
      }
    });

    console.log(`📊 Loaded ${filteredRecords.length} records, ${uniqueRecords.length} unique after deduplication`);

    fuelQuantitiesData = uniqueRecords;
    updateInvoicePreview();

    statusDiv.textContent = `✅ Loaded ${uniqueRecords.length} records`;
    statusDiv.className = "invoice-status success";
  } catch (error) {
    console.error("Error loading invoice data:", error);
    statusDiv.textContent = `❌ Error: ${error.message}`;
    statusDiv.className = "invoice-status error";
  }
};

function updateInvoicePreview() {
  const tbody = document.getElementById("invoicePreviewBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (fuelQuantitiesData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">No records to display</td></tr>';
    return;
  }

  fuelQuantitiesData.forEach((record) => {
    const tr = document.createElement("tr");

    const siteCell = document.createElement("td");
    siteCell.textContent = record.sitename || "N/A";

    const regionCell = document.createElement("td");
    regionCell.textContent = record.region || "N/A";

    const dateCell = document.createElement("td");
    // Convert DATE to DD/MM/YYYY format for display
    dateCell.textContent = record.refilled_date
      ? formatDateDDMMYYYY(record.refilled_date)
      : "N/A";

    const qtyCell = document.createElement("td");
    qtyCell.textContent = record.refilled_quantity
      ? parseFloat(record.refilled_quantity).toFixed(2)
      : "N/A";

    tr.appendChild(siteCell);
    tr.appendChild(regionCell);
    tr.appendChild(dateCell);
    tr.appendChild(qtyCell);
    tbody.appendChild(tr);
  });
}

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr + "T00:00:00Z");
  if (isNaN(date.getTime())) return "N/A";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

async function saveCsvFuelDataToSupabase(rawData) {
  try {
    if (!supabaseClient) {
      console.log("🔌 Supabase client not initialized - initializing...");
      await initSupabaseClient();
    }

    if (!supabaseClient) {
      console.error("❌ Failed to initialize Supabase client");
      return;
    }

    if (rawData.length === 0) {
      console.warn("⚠️ No CSV data to migrate");
      return;
    }

    // Test the connection first with timeout
    console.log("🧪 Testing Supabase connection...");
    console.log("   URL:", VITE_SUPABASE_URL);

    try {
      const { data: testData, error: testError } = await Promise.race([
        supabaseClient
          .from("fuel_quantities")
          .select("id", { count: "exact", head: true }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout after 10 seconds")), 10000)
        )
      ]);

      if (testError) {
        console.error("❌ Supabase connection test failed:", testError.message);
        console.error("Possible causes:");
        console.error("  1. Table 'fuel_quantities' doesn't exist");
        console.error("  2. Supabase credentials are invalid or expired");
        console.error("  3. Network is down or Supabase is unreachable");
        console.error("  4. CORS is blocking the request");
        return;
      }

      console.log("✅ Supabase connection successful");
    } catch (connErr) {
      console.error("❌ Connection test exception:", connErr.message);
      if (connErr.message.includes("timeout")) {
        console.error("   → Supabase is taking too long to respond. Try again in a moment.");
      } else if (connErr.message.includes("Failed to fetch")) {
        console.error("   → Network error. Check your internet connection.");
        console.error("   → If you're behind a proxy/firewall, it may be blocking Supabase requests.");
      }
      return;
    }

    console.log("🔍 Extracting data from CSV columns A, D, AE, AF...");

    // Get column headers from first row (lowercase keys)
    const sampleRow = rawData[0];
    const headers = Object.keys(sampleRow);

    console.log("CSV total headers:", headers.length);
    console.log("All headers:", headers.join(" | "));

    const fuelRecords = rawData
      .map((row) => {
        const rowHeaders = Object.keys(row);

        // Extract sitename - look for the actual site name (not ID)
        // Try different possible column names for the site name
        let sitename = row.sitename ||
                       row['site name'] ||
                       row['site_name'] ||
                       row['sitelabel'] ||
                       row['site label'] ||
                       row['site_label'] ||
                       '';

        // If still empty, try to find any column that looks like a site name
        if (!sitename) {
          const siteKey = Object.keys(row).find(key =>
            key.toLowerCase().includes('site') &&
            !key.toLowerCase().includes('id') &&
            row[key] &&
            String(row[key]).trim() !== ''
          );
          sitename = siteKey ? row[siteKey] : '';
        }

        // Column D (index 3) = region
        const region = (rowHeaders[3] && row[rowHeaders[3]]) ? String(row[rowHeaders[3]]).trim() : '';

        // Column AE (index 30) = refilled_date (DD/MM/YYYY format)
        const refilled_date_raw = (rowHeaders[30] && row[rowHeaders[30]]) ? String(row[rowHeaders[30]]).trim() : '';

        // Column AF (index 31) = refilled_quantity
        const refilled_qty_raw = (rowHeaders[31] && row[rowHeaders[31]]) ? String(row[rowHeaders[31]]).trim() : '';

        // Only include rows with sitename
        if (!sitename || sitename.trim() === '') {
          return null;
        }

        // Convert date to YYYY-MM-DD format for DATE storage
        let refilled_date_iso = null;
        if (refilled_date_raw && refilled_date_raw !== '') {
          refilled_date_iso = convertDateToISO(refilled_date_raw);

          if (!refilled_date_iso) {
            console.warn(`Failed to parse date for site ${sitename}: "${refilled_date_raw}"`);
          }
        }

        return {
          sitename: String(sitename).trim(),
          region: region && region !== '' ? region : null,
          refilled_date: refilled_date_iso,
          refilled_quantity: refilled_qty_raw && refilled_qty_raw !== '' ? parseFloat(refilled_qty_raw) : null,
        };
      })
      .filter((record) => record !== null);

    if (fuelRecords.length === 0) {
      console.log("⚠️ No fuel records extracted from CSV");
      return;
    }

    console.log(`📊 Preparing to migrate ${fuelRecords.length} fuel records to Supabase...`);
    console.log("📋 Sample records (first 3):");
    fuelRecords.slice(0, 3).forEach((record, idx) => {
      console.log(`  [${idx + 1}] Site: ${record.sitename} | Region: ${record.region || 'NULL'} | Date: ${record.refilled_date || 'NULL'} | Qty: ${record.refilled_quantity || 'NULL'}`);
    });

    // Insert records in batches with retry logic
    const BATCH_SIZE = 50;
    let insertedCount = 0;
    const MAX_RETRIES = 3;

    for (let i = 0; i < fuelRecords.length; i += BATCH_SIZE) {
      const batch = fuelRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      let inserted = false;
      let retryCount = 0;

      while (!inserted && retryCount < MAX_RETRIES) {
        try {
          console.log(`📤 Inserting batch ${batchNum} (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          const { data, error } = await supabaseClient
            .from("fuel_quantities")
            .insert(batch);

          if (error) {
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              console.warn(`⚠️ Batch ${batchNum} failed (attempt ${retryCount}): ${error.message}`);
              console.log(`⏳ Waiting 2 seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.error(`❌ Batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${error.message}`);
            }
          } else {
            insertedCount += batch.length;
            console.log(`✅ Batch ${batchNum} inserted: ${batch.length} records (Total: ${insertedCount})`);
            inserted = true;
          }
        } catch (err) {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            console.warn(`⚠️ Batch ${batchNum} exception (attempt ${retryCount}): ${err.message}`);
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.error(`❌ Batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${err.message}`);
          }
        }
      }
    }

    console.log(`\n📍 Migration complete!`);
    console.log(`📊 Total records inserted: ${insertedCount}/${fuelRecords.length}`);
    if (insertedCount === fuelRecords.length) {
      console.log(`✅ All records inserted successfully!`);
    } else {
      console.warn(`⚠️ Some records were not inserted. Expected: ${fuelRecords.length}, Inserted: ${insertedCount}`);
    }
    console.log("📌 Column mapping: A(0)→sitename, D(3)→region, AE(30)→refilled_date, AF(31)→refilled_quantity");
  } catch (err) {
    console.error("❌ Error in saveCsvFuelDataToSupabase:", err);
  }
}

window.downloadInvoiceByDateRange = async function downloadInvoiceByDateRange() {
  const startDateInput = document.getElementById("invoiceStartDate");
  const endDateInput = document.getElementById("invoiceEndDate");
  const regionSelect = document.getElementById("invoiceRegion");
  const statusDiv = document.getElementById("invoiceStatus");

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const selectedRegionFilter = regionSelect.value;

  if (!startDate || !endDate) {
    statusDiv.textContent = "❌ Please select both start and end dates";
    statusDiv.className = "invoice-status error";
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    statusDiv.textContent = "❌ Start date must be before end date";
    statusDiv.className = "invoice-status error";
    return;
  }

  statusDiv.textContent = "⏳ Preparing invoice...";
  statusDiv.className = "invoice-status";

  try {
    let filteredRecords = await fetchFuelQuantitiesByDateRange(
      startDate,
      endDate,
      selectedRegionFilter
    );

    if (filteredRecords.length === 0) {
      statusDiv.textContent = "❌ No records found for selected date range and region";
      statusDiv.className = "invoice-status error";
      return;
    }

    // Deduplicate records based on sitename + refilled_date combination
    const uniqueRecords = [];
    const seen = new Set();

    filteredRecords.forEach((record) => {
      const key = `${record.sitename}|${record.refilled_date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecords.push(record);
      }
    });

    console.log(`📊 Exporting ${filteredRecords.length} records, ${uniqueRecords.length} unique after deduplication`);

    generateInvoiceExcel(uniqueRecords, startDate, endDate, selectedRegionFilter);

    statusDiv.textContent = `✅ Invoice downloaded (${uniqueRecords.length} records)`;
    statusDiv.className = "invoice-status success";
  } catch (error) {
    console.error("Error downloading invoice:", error);
    statusDiv.textContent = `❌ Error: ${error.message}`;
    statusDiv.className = "invoice-status error";
  }
};

async function fetchFuelQuantitiesByDateRange(startDate, endDate, regionFilter = "") {
  if (!supabaseClient) {
    console.log("🔌 Initializing Supabase client for query...");
    await initSupabaseClient();
  }

  if (!supabaseClient) {
    throw new Error("❌ Supabase client not initialized. Check your credentials.");
  }

  try {
    console.log(`🔍 Querying Supabase: date range ${startDate} to ${endDate}, region: ${regionFilter || 'All'}`);

    // Fetch records filtered by date range
    let query = supabaseClient
      .from("fuel_quantities")
      .select("*")
      .gte("refilled_date", startDate)
      .lte("refilled_date", endDate);

    // Apply region filter if specified
    if (regionFilter && regionFilter.trim() !== "") {
      if (regionFilter === "CER") {
        // For CER, fetch records where region contains either Central or East
        query = query.or(`region.like.%Central%,region.like.%East%`);
      } else if (regionFilter === "Central") {
        query = query.like("region", "%Central%");
      } else if (regionFilter === "East") {
        query = query.like("region", "%East%");
      }
    }

    const { data, error } = await query.order("refilled_date", { ascending: true });

    if (error) {
      console.error("❌ Supabase query error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        status: error.status,
        hint: error.hint
      });

      // Better error message
      if (error.message.includes("Failed to fetch")) {
        throw new Error(`Network Error: Cannot reach Supabase. Check your internet connection and Supabase URL: ${VITE_SUPABASE_URL}`);
      } else {
        throw new Error(`Database error: ${error.message}`);
      }
    }

    console.log(`✅ Fetched ${data?.length || 0} records from Supabase`);
    return data || [];
  } catch (err) {
    console.error("❌ Exception in fetchFuelQuantitiesByDateRange:", err);

    // Provide helpful debugging info
    if (err.message.includes("Failed to fetch")) {
      console.error("🔧 Debugging info:");
      console.error("  - Supabase URL:", VITE_SUPABASE_URL);
      console.error("  - Client initialized:", !!supabaseClient);
      console.error("  - This could be a CORS issue or network connectivity problem");
    }

    throw err;
  }
}

function generateInvoiceExcel(records, startDate, endDate, regionFilter = "") {
  const invoiceData = records.map((record) => ({
    "Site Name": record.sitename,
    "Region": record.region || "",
    "Refilled Date": formatDateDDMMYYYY(record.refilled_date),
    "Refilled Quantity": record.refilled_quantity || "",
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(invoiceData);

  worksheet["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Fuel Invoice");

  const regionSuffix = regionFilter ? `_${regionFilter}` : "";
  const fileName = `Fuel_Invoice${regionSuffix}_${startDate}_to_${endDate}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
