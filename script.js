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
let autoZoomIndex = 0;
let autoZoomInterval = null;

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

            return (
                regionname === 'Central' &&
                (cowstatus === 'ON-AIR' || cowstatus === 'IN PROGRESS') &&
                !isNaN(lat) &&
                !isNaN(lng)
            );
        })
        .map(row => {
            const lat = parseFloat(row.lat || row.latitude || '');
            const lng = parseFloat(row.lng || row.longitude || '');

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

function getStatusColor(status) {
    return STATUS_COLORS[status] || STATUS_COLORS.next15;
}

function getStatusLabel(status) {
    const labels = {
        due: 'Overdue',
        today: 'Today',
        coming3: 'Coming Soon',
        next15: 'Healthy'
    };
    return labels[status] || 'Unknown';
}

function updateMetrics(sites) {
    const totalSites = sites.length;
    const dueSites = sites.filter(s => s.status === 'due').length;
    const todaySites = sites.filter(s => s.status === 'today').length;
    const futureSites = sites.filter(s => s.status === 'next15').length;

    document.getElementById('totalSites').textContent = totalSites;
    document.getElementById('dueSites').textContent = dueSites;
    document.getElementById('todaySites').textContent = todaySites;
    document.getElementById('futureSites').textContent = futureSites;
}

function populateDueTable(sites) {
    const dueSites = sites
        .filter(s => s.status === 'due')
        .sort((a, b) => a.sitename.localeCompare(b.sitename));

    const todaySites = sites
        .filter(s => s.status === 'today')
        .sort((a, b) => a.sitename.localeCompare(b.sitename));

    const comingSites = sites
        .filter(s => s.status === 'coming3')
        .sort((a, b) => a.sitename.localeCompare(b.sitename));

    const futureSites = sites
        .filter(s => s.status === 'next15')
        .sort((a, b) => a.sitename.localeCompare(b.sitename));

    populateOverdueTable(dueSites);
    populateTodayTable(todaySites);
    populateComingTable(comingSites);
    populateFutureTable(futureSites);
}

function populateOverdueTable(sites) {
    const tbody = document.getElementById('overdueTableBody');
    tbody.innerHTML = '';

    if (sites.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="2" style="text-align: center; color: #94a3b8; padding: 12px;">No overdue sites</td>';
        tbody.appendChild(tr);
        return;
    }

    sites.forEach(site => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${site.sitename}</td>
            <td><span style="color: #ff6b6b; font-weight: 600;">${site.days}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function populateTodayTable(sites) {
    const tbody = document.getElementById('todayTableBody');
    tbody.innerHTML = '';

    if (sites.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="2" style="text-align: center; color: #94a3b8; padding: 12px;">No sites due today</td>';
        tbody.appendChild(tr);
        return;
    }

    sites.forEach(site => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${site.sitename}</td>
            <td>${site.nextfuelingplan}</td>
        `;
        tbody.appendChild(tr);
    });
}

function populateComingTable(sites) {
    const tbody = document.getElementById('comingTableBody');
    tbody.innerHTML = '';

    if (sites.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="2" style="text-align: center; color: #94a3b8; padding: 12px;">No sites coming in 3 days</td>';
        tbody.appendChild(tr);
        return;
    }

    sites.forEach(site => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${site.sitename}</td>
            <td><span style="color: #ffbe0b; font-weight: 600;">${site.days}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function populateFutureTable(sites) {
    const tbody = document.getElementById('futureTableBody');
    tbody.innerHTML = '';

    if (sites.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="2" style="text-align: center; color: #94a3b8; padding: 12px;">No sites in next 3-15 days</td>';
        tbody.appendChild(tr);
        return;
    }

    sites.forEach(site => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${site.sitename}</td>
            <td><span style="color: #3ad17c; font-weight: 600;">${site.days}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function initMap() {
    map = L.map('map').setView(SA_CENTER, 5);
    map.setMaxBounds(SA_BOUNDS);

    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles © Esri | Maxar',
            maxZoom: 18
        }
    ).addTo(map);
}

function addMarkersToMap(sites) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const redSites = sites.filter(s => s.status === 'due' || s.status === 'today');

    sites.forEach(site => {
        const color = site.color || getStatusColor(site.status);
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px ${color}; display: flex; align-items: center; justify-content: center;"></div>`,
            iconSize: [30, 30],
            popupAnchor: [0, -15]
        });

        const marker = L.marker([site.lat, site.lng], { icon: icon })
            .bindPopup(`
                <h4>${site.sitename}</h4>
                <p><strong>Status:</strong> ${getStatusLabel(site.status)}</p>
                <p><strong>Days:</strong> ${site.days !== null ? site.days : 'N/A'}</p>
                <p><strong>Fuel Date:</strong> ${site.nextfuelingplan || 'No Date'}</p>
            `)
            .addTo(map);

        markers.push(marker);
    });

    if (redSites.length > 0) {
        const group = new L.featureGroup(
            markers.filter(m => {
                const site = sites.find(s => s.lat === m.getLatLng().lat && s.lng === m.getLatLng().lng);
                return site && (site.status === 'due' || site.status === 'today');
            })
        );

        if (group.getLayers().length > 0) {
            map.fitBounds(group.getBounds().pad(0.1));
            startAutoZoomLoop(redSites);
        }
    } else if (markers.length > 0) {
        const allGroup = new L.featureGroup(markers);
        map.fitBounds(allGroup.getBounds().pad(0.1));
    }
}

function startAutoZoomLoop(dueSites) {
    if (dueSites.length === 0) return;

    if (autoZoomInterval) {
        clearInterval(autoZoomInterval);
    }

    autoZoomIndex = 0;

    autoZoomInterval = setInterval(() => {
        if (dueSites.length === 0) {
            clearInterval(autoZoomInterval);
            return;
        }

        const currentSite = dueSites[autoZoomIndex];
        const targetMarker = markers.find(m => {
            const latlng = m.getLatLng();
            return latlng.lat === currentSite.lat && latlng.lng === currentSite.lng;
        });

        if (targetMarker) {
            map.setView(targetMarker.getLatLng(), 10);
            targetMarker.openPopup();
        }

        autoZoomIndex = (autoZoomIndex + 1) % dueSites.length;
    }, 5000);
}

async function loadDashboard() {
    const rawData = await fetchCSV();
    sitesData = filterAndValidateSites(rawData);

    updateMetrics(sitesData);
    populateDueTable(sitesData);
    addMarkersToMap(sitesData);
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadDashboard();
});
