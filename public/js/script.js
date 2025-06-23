let currentData = null;

function formatDistance(meters) {
    const km = meters / 1000;
    return km.toFixed(2) + ' km';
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function formatPace(hoursPerKm) {
    if (hoursPerKm === 0) return 'N/A';
    const minutesPerKm = hoursPerKm * 60;
    const minutes = Math.floor(minutesPerKm);
    const seconds = Math.floor((minutesPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('error').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    document.getElementById('error').textContent = message;
    document.getElementById('error').style.display = 'block';
    hideLoading();
}

function updateStats(data) {
    const totalAthletes = data.leaderboard.length;
    const totalActivities = data.totalActivities;
    const totalDistance = data.leaderboard.reduce((sum, athlete) => sum + athlete.totalDistanceKm, 0);

    document.getElementById('totalAthletes').textContent = totalAthletes;
    document.getElementById('totalActivities').textContent = totalActivities;
    document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
}

function showStats() {
    const statsDiv = document.getElementById('stats');
    if (statsDiv.style.display === 'none') {
        statsDiv.style.display = 'grid';
        if (currentData) {
            updateStats(currentData);
        }
    } else {
        statsDiv.style.display = 'none';
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
            <td class="distance">${athlete.totalDistanceKm.toFixed(2)} km</td>
            <td class="time">${formatTime(athlete.totalTime)}</td>
            <td class="pace">${formatPace(athlete.averagePace)}</td>
            <td class="activities">${athlete.activities}</td>
        `;
        tbody.appendChild(row);

        const detailsRow = document.createElement('tr');
        detailsRow.id = `details-${index}`;
        detailsRow.classList.add('activity-details');
        detailsRow.style.display = 'none';

        let detailsHtml = '<td colspan="6">';
        detailsHtml += '<div class="details-container">';
        detailsHtml += '<h5><i class="fas fa-tasks"></i> Rincian Aktivitas</h5>';
        detailsHtml += '<table class="details-table">';
        detailsHtml += '<thead><tr><th>Nama Aktivitas</th><th>Jarak</th><th>Waktu</th></tr></thead>';
        detailsHtml += '<tbody>';

        athlete.activityList.forEach(activity => {
            detailsHtml += `
                <tr>
                    <td>${activity.name}</td>
                    <td>${formatDistance(activity.distance)}</td>
                    <td>${formatTime(activity.moving_time)}</td>
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
    setActiveTab(clubType);
    showLoading();
    
    try {
        const response = await fetch(`/api/leaderboard/${clubType}`);
        const result = await response.json();
        
        if (result.success) {
            displayLeaderboard(result.data);
        } else {
            showError('Gagal memuat data: ' + result.error);
        }
    } catch (error) {
        showError('Error koneksi: ' + error.message);
    }
    
    hideLoading();
}

document.addEventListener('DOMContentLoaded', function() {
    loadLeaderboard('woman');
}); 