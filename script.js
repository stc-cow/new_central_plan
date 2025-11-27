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

/* ===========================================================================
   LOAD CSV
   =========================================================================== */

async function fetchCSV() {
    try {
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Error fetching CSV:', error);
        return [];
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = parseCSVLine(line);
        const row = {};

        headers.forEach((header, index) => {
            row[header.toLowerCase()] = values[index] ? values[index].trim() : '';
        });

        data.push(row);
    }

    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

/* ===========================================================================
   FILTER + VALIDATE
   =========================================================================== */

function filterAndValidateSites(rawData) {
    return rawData
        .filter(row => {
            const regionname = row.regionname ? row.regionname.trim() : '';

            const cowstatusKey = Object.keys(row).find(key =>
                key.toLowerCase() === 'cowstatus'
            );
            const cowstatus = cowstatusKey ? row[cowstatusKey].trim().toUpperCase() : '';

            const lat = parseFloat(row.lat || row.latitude || '');
            const lng = parseFloat(row.lng || row.longitude || '');
            const sitename = row.sitename || '';

            return (
                regionname.includes('Central') &&
                (cowstatus === 'ON-AIR' || cowstatus === 'IN PROGRESS') &&
                sitename.trim() !== '' &&
                !isNaN(lat) &&
                !isNaN(lng)
            );
        })
        .map(row => {
            const lat = parseFloat(row.lat || row.latitude || '');
            const lng = parseFloat(row.lng || row.longitude || '');

            const cowIdKey = Object.keys(row).find(
                key => key.replace(/\s+/g, '') === 'cowid'
            );
            const cowId = cowIdKey ? row[cowIdKey] : '';

            const nextfuelingplanKey = Object.keys(row).find(key =>
                key.toLowerCase() === 'nextfuelingplan'
            );
            const nextfuelingplan = nextfuelingplanKey ? row[nextfuelingplanKey] : '';
            const fuelDate = parseFuelDate(nextfuelingplan);
            const days = dayDiff(fuelDate);
            const statusObj = classify(days);

            return {
                sitename: row.sitename || 'Unknown Site',
                regionname: row.regionname || '',
                cowstatus: row.cowstatus || '',
                cowid: cowId || row.sitename || '',
                nextfuelingplan: nextfuelingplan || '',
                lat: lat,
                lng: lng,
                fuelDate: fuelDate,
                days: days,
                status: statusObj.label,
                color: statusObj.color
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

/* ===========================================================================
   METRICS + TABLES
   =========================================================================== */

function updateMetrics(sites) {
    document.getElementById('totalSites').textContent = sites.length;
    document.getElementById('dueSites').textContent = sites.filter(s => s.status === 'due').length;
    document.getElementById('todaySites').textContent = sites.filter(s => s.status === 'today').length;
    document.getElementById('futureSites').textContent = sites.filter(s => s.status === 'next15').length;
}

function populateDueTable(sites) {
    populateOverdueTable(sites.filter(s => s.status === 'due'));
    populateTodayTable(sites.filter(s => s.status === 'today'));
    populateComingTable(sites.filter(s => s.status === 'coming3'));
}

function populateOverdueTable(sites) {
    const tbody = document.getElementById('overdueTableBody');
    tbody.innerHTML = '';

    if (sites.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:12px;">No overdue sites</td></tr>`;
        return;
    }

    sites.forEach(site => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `<td>${site.sitename}</td>
                        <td><span style="color:#ff6b6b;font-weight:600;">${site.days}</span></td>`;
        tr.addEventListener('click', () => zoomToSite(site.sitename));
        tbody.appendChild(tr);
    });
}

function populateTodayTable(sites) {
    const tbody = document.getElementById('todayTableBody');
    tbody.innerHTML = '';

    if (sites.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:12px;">No sites due today</td></tr>`;
        return;
    }

    sites.forEach(site => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `<td>${site.sitename}</td><td>${site.nextfuelingplan}</td>`;
        tr.addEventListener('click', () => zoomToSite(site.sitename));
        tbody.appendChild(tr);
    });
}

function populateComingTable(sites) {
    const tbody = document.getElementById('comingTableBody');
    tbody.innerHTML = '';

    if (sites.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:12px;">No sites coming in 3 days</td></tr>`;
        return;
    }

    sites.forEach(site => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${site.sitename}</td>
                        <td><span style="color:#ffbe0b;font-weight:600;">${site.days}</span></td>`;
        tbody.appendChild(tr);
    });
}

/* ===========================================================================
   MAP + MARKERS
   =========================================================================== */

function initMap() {
    map = L.map('map').setView(SA_CENTER, 5);
    map.setMaxBounds(SA_BOUNDS);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri | Maxar',
        maxZoom: 18,
        minZoom: 3
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 18,
        minZoom: 3,
        opacity: 0.9
    }).addTo(map);
}

function addMarkersToMap(sites) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    siteMap = {};

    pulsingCircles.forEach(circle => map.removeLayer(circle));
    pulsingCircles = [];

    sites.forEach(site => {
        const color = site.color;

        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px ${color};"></div>`,
            iconSize: [30, 30],
            popupAnchor: [0, -15]
        });

        const marker = L.marker([site.lat, site.lng], { icon })
            .bindPopup(`
                <h4>${site.sitename}</h4>
                <p><strong>Status:</strong> ${getStatusLabel(site.status)}</p>
                <p><strong>Days:</strong> ${site.days ?? 'N/A'}</p>
                <p><strong>Fuel Date:</strong> ${site.nextfuelingplan || 'No Date'}</p>
            `)
            .addTo(map);

        markers.push(marker);
        siteMap[site.sitename.toUpperCase()] = { marker, site };

        if (site.status === 'due' || site.status === 'today') {
            const pulse = L.circle([site.lat, site.lng], {
                radius: 300,
                color: color,
                weight: 2,
                fillOpacity: 0.25,
                className: 'pulsing-circle'
            }).addTo(map);

            pulsingCircles.push(pulse);
        }
    });

    if (markers.length > 0) {
        const allGroup = new L.featureGroup(markers);
        map.fitBounds(allGroup.getBounds().pad(0.1));
    }
}

function zoomToSite(sitename) {
    const key = sitename.toUpperCase();
    const siteInfo = siteMap[key];
    if (siteInfo) {
        map.setView(siteInfo.marker.getLatLng(), 17);
        siteInfo.marker.openPopup();
    }
}

/* ===========================================================================
   SEARCH BAR FEATURE
   =========================================================================== */

function setupSearch() {
    if (searchInitialized) return;

    const input = document.getElementById('siteSearchInput');
    const button = document.getElementById('searchBtn');
    const resultBox = document.getElementById('searchResult');

    const performSearch = () => {
        const query = input.value.trim().toUpperCase();

        if (!query) {
            resultBox.style.display = 'block';
            resultBox.innerHTML = '⚠️ Please enter a Site ID or COW ID.';
            return;
        }

        const site = sitesData.find(s =>
            (s.cowid || '').toUpperCase() === query ||
            (s.sitename || '').toUpperCase() === query
        );

        if (!site) {
            resultBox.style.display = 'block';
            resultBox.innerHTML = `❌ No match found for <strong>${query}</strong>.`;
            return;
        }

        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <strong>Site:</strong> ${site.sitename}<br>
            <strong>COW ID:</strong> ${site.cowid}<br>
            <strong>Next Fuel Date:</strong> ${site.nextfuelingplan || 'N/A'}<br>
            <strong>Status:</strong> ${site.status.toUpperCase()}<br>
            <strong>Days Remaining:</strong> ${site.days}
        `;

        zoomToSite(site.sitename);

        L.circle([site.lat, site.lng], {
            radius: 300,
            color: '#1e3a8a',
            weight: 3,
            fillColor: '#3b82f6',
            fillOpacity: 0.35
        }).addTo(map);
    };

    button.addEventListener('click', performSearch);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') performSearch(); });

    searchInitialized = true;
}

/* ===========================================================================
   MAIN
   =========================================================================== */

async function loadDashboard() {
    const rawData = await fetchCSV();
    sitesData = filterAndValidateSites(rawData);

    updateMetrics(sitesData);
    populateDueTable(sitesData);
    addMarkersToMap(sitesData);
    setupSearch();
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadDashboard();
});
