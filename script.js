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

    populateOverdueTable(dueSites);
    populateTodayTable(todaySites);
    populateComingTable(comingSites);
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
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
            <td>${site.sitename}</td>
            <td><span style="color: #ff6b6b; font-weight: 600;">${site.days}</span></td>
        `;
        tr.addEventListener('click', () => zoomToSite(site.sitename));
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
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
            <td>${site.sitename}</td>
            <td>${site.nextfuelingplan}</td>
        `;
        tr.addEventListener('click', () => zoomToSite(site.sitename));
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


function initMap() {
    map = L.map('map').setView(SA_CENTER, 5);
    map.setMaxBounds(SA_BOUNDS);

    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles © Esri | Maxar',
            maxZoom: 18,
            minZoom: 3
        }
    ).addTo(map);

    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles © Esri',
            maxZoom: 18,
            minZoom: 3,
            opacity: 0.9
        }
    ).addTo(map);
}

function addMarkersToMap(sites) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    siteMap = {};

    pulsingCircles.forEach(circle => map.removeLayer(circle));
    pulsingCircles = [];

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
        siteMap[site.sitename] = { marker: marker, site: site };

        if (site.status === 'due' || site.status === 'today') {
            const baseRadius = 300;
            const pulsingCircle = L.circle([site.lat, site.lng], {
                radius: baseRadius,
                color: site.color || '#ff6b6b',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.25,
                className: 'pulsing-circle'
            }).addTo(map);

            let pulseStartTime = Date.now();
            const pulseDuration = 2500;

            const animatePulse = () => {
                const elapsed = (Date.now() - pulseStartTime) % pulseDuration;
                const progress = elapsed / pulseDuration;
                const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

                const minRadius = 200;
                const maxRadius = 550;
                const newRadius = minRadius + (maxRadius - minRadius) * easeProgress;

                const minOpacity = 0.4;
                const maxOpacity = 0.95;
                const newOpacity = maxOpacity - (maxOpacity - minOpacity) * easeProgress;

                pulsingCircle.setRadius(newRadius);
                pulsingCircle.setStyle({ opacity: newOpacity });

                requestAnimationFrame(animatePulse);
            };

            animatePulse();
            pulsingCircles.push(pulsingCircle);
        }
    });

    if (markers.length > 0) {
        const allGroup = new L.featureGroup(markers);
        map.fitBounds(allGroup.getBounds().pad(0.1));
    }
}

function zoomToSite(sitename) {
    const siteInfo = siteMap[sitename];
    if (siteInfo && siteInfo.marker) {
        map.setView(siteInfo.marker.getLatLng(), 17);
        siteInfo.marker.openPopup();
    }
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
