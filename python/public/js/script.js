let currentData = null;
let chartInstance = null;
let isLoading = false;
let currentClubType = null;

function formatDistance(meters) {
    const km = meters / 1000;
    return km.toFixed(2) + ' km';
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0) result += `${minutes}m `;
    result += `${secs}s`;
    return result.trim();
}

function formatPace(hoursPerKm) {
    if (hoursPerKm === 0) return 'N/A';
    const minutesPerKm = hoursPerKm * 60;
    const minutes = Math.floor(minutesPerKm);
    const seconds = Math.round((minutesPerKm - minutes) * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}/km`;
}

function formatPaceSeconds(secondsPerKm) {
    if (!isFinite(secondsPerKm) || secondsPerKm <= 0) return 'N/A';
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}/km`;
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    document.getElementById('stats').style.display = 'none';
    document.getElementById('chart-container').style.display = 'none';
    document.getElementById('podiumSection').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'block';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'none';
}

function updateStats(data) {
    const totalAthletes = data.leaderboard.length;
    const totalActivities = data.totalActivities;
    const totalDistance = data.leaderboard.reduce((sum, athlete) => sum + athlete.totalDistanceKm, 0);
    const totalFinisher = data.leaderboard.filter(athlete => athlete.totalDistanceKm >= 30).length;

    document.getElementById('totalAthletes').textContent = totalAthletes;
    document.getElementById('totalActivities').textContent = totalActivities;
    document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
    document.getElementById('totalFinisher').textContent = totalFinisher;
}

function showPodium() {
    const podiumSection = document.getElementById('podiumSection');
    const btnPodium = document.querySelector('.btn-podium');

    // Hide other sections
    document.getElementById('stats').style.display = 'none';
    document.getElementById('chart-container').style.display = 'none';
    document.querySelector('.btn.btn-secondary[onclick="showStats()"]').classList.remove('active');
    document.querySelector('.btn.btn-secondary[onclick="showChart()"]').classList.remove('active');

    // Toggle Podium
    if (podiumSection.style.display === 'block') {
        podiumSection.style.display = 'none';
        btnPodium.classList.remove('active');
        return;
    }

    if (!currentData || !currentData.leaderboard) return;
    const podium = currentData.leaderboard.slice(0, 5);
    let html = '<h2 style="margin-bottom:10px;">Podium 1-5</h2>';
    html += '<div class="podium-row">';
    podium.forEach((athlete, i) => {
        const rank = i + 1;
        html += `
            <div class="podium-box podium-${rank}">
                <div class="podium-badge">${rank}</div>
                <div class="podium-distance">${athlete.totalDistanceKm.toFixed(2)} km</div>
                <div class="podium-name" title="${athlete.name}">${athlete.name}</div>
            </div>
        `;
    });
    html += '</div>';
    podiumSection.innerHTML = html;
    podiumSection.style.display = 'block';
    btnPodium.classList.add('active');
}

function showStats() {
    const statsDiv = document.getElementById('stats');
    const btnStats = document.querySelector('.btn.btn-secondary[onclick="showStats()"]');

    // Hide other sections
    document.getElementById('podiumSection').style.display = 'none';
    document.getElementById('chart-container').style.display = 'none';
    document.querySelector('.btn-podium').classList.remove('active');
    document.querySelector('.btn.btn-secondary[onclick="showChart()"]').classList.remove('active');

    // Toggle Stats
    if (statsDiv.style.display === 'none') {
        statsDiv.style.display = 'grid';
        btnStats.classList.add('active');
        if (currentData) {
            updateStats(currentData);
        }
    } else {
        statsDiv.style.display = 'none';
        btnStats.classList.remove('active');
    }
}

function showChart() {
    const chartContainer = document.getElementById('chart-container');
    const btnChart = document.querySelector('.btn.btn-secondary[onclick="showChart()"]');

    // Hide other sections
    document.getElementById('podiumSection').style.display = 'none';
    document.getElementById('stats').style.display = 'none';
    document.querySelector('.btn-podium').classList.remove('active');
    document.querySelector('.btn.btn-secondary[onclick="showStats()"]').classList.remove('active');
    
    // Toggle Chart
    if (chartContainer.style.display === 'none') {
        chartContainer.style.display = 'block';
        btnChart.classList.add('active');
        renderLeaderboardChart();
    } else {
        chartContainer.style.display = 'none';
        btnChart.classList.remove('active');
    }
}

function displayLeaderboard(data) {
    currentData = data;
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';

    document.getElementById('leaderboard-title').textContent = data.clubName;

    const startDate = new Date(data.eventPeriod.start + 'T00:00:00');
    const endDate = new Date(data.eventPeriod.end + 'T00:00:00');
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedStart = startDate.toLocaleDateString('id-ID', options);
    const formattedEnd = endDate.toLocaleDateString('id-ID', options);
    document.getElementById('event-period-header').innerHTML = `<i class="fas fa-calendar-alt"></i> Periode: ${formattedStart} - ${formattedEnd}`;

    data.leaderboard.forEach((athlete, index) => {
        const row = document.createElement('tr');
        row.classList.add('athlete-row');
        row.addEventListener('click', () => toggleActivities(index));
        
        const rank = index + 1;
        
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        row.innerHTML = `
            <td class="rank ${rankClass}">${rank}</td>
            <td class="athlete-name">${athlete.name} <i class="fas fa-chevron-down activity-toggle-icon"></i></td>
            <td class="distance center">${athlete.totalDistanceKm.toFixed(2)} km</td>
            <td class="time center">${formatTime(athlete.totalTime)}</td>
            <td class="pace center">${formatPace(athlete.averagePace)}</td>
            <td class="activities center">${athlete.activities}</td>
            <td class="center">${athlete.totalDistanceKm >= 30 ? '<span class=\'badge badge-success\'>YES</span>' : '<span class=\'badge badge-danger\'>NO</span>'}</td>
        `;
        tbody.appendChild(row);

        const detailsRow = document.createElement('tr');
        detailsRow.id = `details-${index}`;
        detailsRow.classList.add('activity-details');
        detailsRow.style.display = 'none';

        let detailsHtml = '<td colspan="7">';
        detailsHtml += '<div class="details-container">';
        detailsHtml += '<h5><i class="fas fa-tasks"></i> Rincian Aktivitas</h5>';
        detailsHtml += '<table class="details-table">';
        detailsHtml += '<thead><tr><th class="center">Tanggal</th><th class="center">Nama Aktivitas</th><th class="center">Jarak</th><th class="center">Waktu</th><th class="center">Pace</th></tr></thead>';
        detailsHtml += '<tbody>';

        athlete.activityList.forEach(activity => {
            const paceSeconds = activity.distance > 0 ? activity.moving_time / (activity.distance / 1000) : 0;
            let dateTimeStr = '-';
            if (activity.start_date) {
                const d = new Date(activity.start_date);
                const jam = d.getHours().toString().padStart(2, '0');
                const menit = d.getMinutes().toString().padStart(2, '0');
                const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
                const tanggal = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                dateTimeStr = `${jam}:${menit}, ${hari}, ${tanggal}`;
            }
            detailsHtml += `
                <tr>
                    <td class="center">${dateTimeStr}</td>
                    <td class="center">${activity.name}</td>
                    <td class="center">${formatDistance(activity.distance)}</td>
                    <td class="center">${formatTime(activity.moving_time)}</td>
                    <td class="center">${formatPaceSeconds(paceSeconds)}</td>
                </tr>
            `;
        });

        detailsHtml += '</tbody></table></div></td>';
        detailsRow.innerHTML = detailsHtml;
        tbody.appendChild(detailsRow);
    });

    document.getElementById('leaderboard').style.display = 'block';

    const d = new Date(data.lastUpdated);
    const date = d.toLocaleDateString('id-ID');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const time = `${hours}:${minutes}:${seconds}`;
    document.getElementById('lastUpdated').textContent = `Terakhir diperbarui: ${date}, ${time}`;
    
    if (document.getElementById('stats').style.display === 'grid') {
        updateStats(data);
    }

    setTimeout(() => {
        document.querySelectorAll('.activity-link').forEach(link => {
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                const activityId = this.getAttribute('data-activity-id');
                if (!activityId) return;
                showActivityModal(activityId);
            });
        });
    }, 0);
}

function toggleActivities(index) {
    const detailsRow = document.getElementById(`details-${index}`);
    const athleteRow = detailsRow.previousElementSibling;

    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        athleteRow.classList.add('active');
    } else {
        detailsRow.style.display = 'none';
        athleteRow.classList.remove('active');
    }
}

function setActiveTab(clubType) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-${clubType}`).classList.add('active');
}

async function loadLeaderboard(clubType) {
    // Prevent multiple simultaneous requests
    if (isLoading || clubType === currentClubType) {
        console.log('Skipping request - already loading or same club type');
        return;
    }

    setActiveTab(clubType);
    currentClubType = clubType;
    isLoading = true;
    showLoading();
    
    try {
        console.log('Fetching leaderboard for:', clubType);
        const response = await fetch(`http://localhost:3001/api/leaderboard/${clubType}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
            displayLeaderboard(result.data);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showError('Error koneksi: ' + error.message);
    } finally {
        isLoading = false;
        hideLoading();
    }
}

function renderLeaderboardChart() {
    const ctx = document.getElementById('leaderboardChart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    if (!currentData || !currentData.leaderboard) return;
    const labels = currentData.leaderboard.map(a => a.name);
    const data = currentData.leaderboard.map(a => a.totalDistanceKm);
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Jarak (km)',
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                borderRadius: 8,
                maxBarThickness: 40
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#2c3e50', font: { weight: 'bold' } },
                    grid: { color: '#f0f0f0' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Jarak (km)' },
                    ticks: { color: '#2c3e50' },
                    grid: { color: '#f0f0f0' }
                }
            }
        }
    });
}

async function showActivityModal(activityId) {
    document.getElementById('modalOverlay').style.display = 'block';
    document.getElementById('activityModal').style.display = 'block';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;">Loading...</div>';
    try {
        const res = await fetch(`/api/activity/${activityId}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        const activity = result.data;
        let html = '';
        // Splits
        if (activity.splits_metric && activity.splits_metric.length > 0) {
            html += '<h3>Splits (per KM)</h3>';
            html += '<table class="splits-table"><thead><tr><th>KM</th><th>Pace</th><th>Elev</th></tr></thead><tbody>';
            activity.splits_metric.forEach(split => {
                const pace = formatPaceSeconds(split.moving_time / split.distance * 1000);
                html += `<tr><td>${split.split}</td><td>${pace}</td><td>${split.elevation_difference} m</td></tr>`;
            });
            html += '</tbody></table>';
        }
        // Map
        if (activity.map && activity.map.summary_polyline) {
            html += '<h3>Map</h3>';
            html += '<div id="activityMap"></div>';
        }
        document.getElementById('modalBody').innerHTML = html || '<div style="text-align:center;">No detail available.</div>';
        // Render map if polyline exists
        if (activity.map && activity.map.summary_polyline) {
            renderActivityMap(activity.map.summary_polyline);
        }
    } catch (err) {
        document.getElementById('modalBody').innerHTML = `<div style="color:red;">Gagal memuat detail aktivitas: ${err.message}</div>`;
    }
}

// Modal close logic
if (document.getElementById('closeModal')) {
    document.getElementById('closeModal').onclick = function() {
        document.getElementById('activityModal').style.display = 'none';
        document.getElementById('modalOverlay').style.display = 'none';
        document.getElementById('modalBody').innerHTML = '';
    };
}
if (document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').onclick = function() {
        document.getElementById('activityModal').style.display = 'none';
        document.getElementById('modalOverlay').style.display = 'none';
        document.getElementById('modalBody').innerHTML = '';
    };
}

// Polyline decode and map render (simple static SVG)
function renderActivityMap(polyline) {
    // Use https://github.com/mapbox/polyline for real map, here just placeholder
    // For demo, show a static message
    document.getElementById('activityMap').innerHTML = '<div style="text-align:center; color:#888;">[Map preview here]<br>Integrasi map interaktif bisa ditambah sesuai kebutuhan.</div>';
}

// Initialize only once when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load woman leaderboard by default
    loadLeaderboard('woman');
    
    // Add click handlers to tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const clubType = this.id.replace('tab-', '');
            loadLeaderboard(clubType);
        });
    });
}); 