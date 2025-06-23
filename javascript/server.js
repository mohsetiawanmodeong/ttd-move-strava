const express = require('express');
const axios = require('axios');
const cors = require('cors');
const moment = require('moment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Strava API configuration
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

// Club Configuration Mapping
const clubConfig = {
    woman: {
        id: process.env.STRAVA_CLUB_ID_WOMAN,
        filter: ['Walk'],
        name: 'TTD MOVE HL 2025 - WOMAN'
    },
    walk: {
        id: process.env.STRAVA_CLUB_ID_WALK,
        filter: ['Walk'],
        name: 'TTD MOVE HL 2025 - WALK'
    },
    run: {
        id: process.env.STRAVA_CLUB_ID_RUN,
        filter: ['Run', 'TrailRun'],
        name: 'TTD MOVE HL 2025 - RUN'
    }
};

// Event period configuration
const EVENT_START_DATE = '2025-06-07';
const EVENT_END_DATE = '2025-07-06';

let accessToken = null;
let tokenExpiry = null;

// Function to refresh Strava access token
async function refreshAccessToken() {
    try {
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: STRAVA_REFRESH_TOKEN
        });

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        
        console.log('Access token refreshed successfully');
        return accessToken;
    } catch (error) {
        console.error('Error refreshing access token:', error.message);
        throw error;
    }
}

// Function to get valid access token
async function getValidAccessToken() {
    if (!accessToken || Date.now() >= tokenExpiry) {
        await refreshAccessToken();
    }
    return accessToken;
}

// Function to get club activities for a specific club
async function getClubActivities(clubId) {
    try {
        const token = await getValidAccessToken();
        const response = await axios.get(`https://www.strava.com/api/v3/clubs/${clubId}/activities`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                per_page: 200
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching activities for club ${clubId}:`, error.message);
        throw error;
    }
}

// Function to filter activities by allowed types
function filterActivitiesBySportType(activities, allowedTypes) {
    return activities.filter(activity => {
        const activityDate = moment(activity.start_date).format('YYYY-MM-DD');
        const isInEventPeriod = activityDate >= EVENT_START_DATE && activityDate <= EVENT_END_DATE;
        const isAllowedType = allowedTypes.includes(activity.sport_type);
        
        return isInEventPeriod && isAllowedType;
    });
}

// Function to calculate leaderboard
function calculateLeaderboard(activities) {
    const leaderboard = {};
    
    activities.forEach(activity => {
        const athleteName = activity.athlete.firstname + ' ' + activity.athlete.lastname;
        const athleteKey = athleteName;
        const distance = activity.distance;
        const movingTime = activity.moving_time;
        
        if (!leaderboard[athleteKey]) {
            leaderboard[athleteKey] = {
                name: athleteName,
                totalDistance: 0,
                totalTime: 0,
                activities: 0,
                averagePace: 0,
                activityList: []
            };
        }
        
        leaderboard[athleteKey].totalDistance += distance;
        leaderboard[athleteKey].totalTime += movingTime;
        leaderboard[athleteKey].activities += 1;
        leaderboard[athleteKey].activityList.push({
            id: activity.id,
            name: activity.name,
            distance: activity.distance,
            moving_time: activity.moving_time,
            start_date: activity.start_date
        });
    });
    
    const leaderboardArray = Object.values(leaderboard).map(athlete => {
        const totalDistanceKm = athlete.totalDistance / 1000;
        const totalTimeHours = athlete.totalTime / 3600;
        athlete.averagePace = totalDistanceKm > 0 ? totalTimeHours / totalDistanceKm : 0;
        athlete.totalDistanceKm = totalDistanceKm;
        athlete.totalTimeHours = totalTimeHours;
        return athlete;
    });
    
    return leaderboardArray.sort((a, b) => b.totalDistance - a.totalDistance);
}

// API endpoint to get leaderboard for a specific club type
app.get('/api/leaderboard/:clubType', async (req, res) => {
    const { clubType } = req.params;
    const config = clubConfig[clubType];

    if (!config) {
        return res.status(404).json({ success: false, error: 'Invalid club type specified.' });
    }

    try {
        console.log(`Fetching activities for ${config.name}...`);
        const activities = await getClubActivities(config.id);
        
        console.log(`Found ${activities.length} total activities for ${clubType}.`);
        const filteredActivities = filterActivitiesBySportType(activities, config.filter);
        
        console.log(`Found ${filteredActivities.length} valid activities for ${clubType}.`);
        const leaderboard = calculateLeaderboard(filteredActivities);
        
        res.json({
            success: true,
            data: {
                leaderboard,
                clubName: config.name,
                eventPeriod: {
                    start: EVENT_START_DATE,
                    end: EVENT_END_DATE
                },
                totalActivities: filteredActivities.length,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error(`Error in leaderboard endpoint for ${clubType}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to get activity details from Strava
app.get('/api/activity/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const token = await getValidAccessToken();
        const response = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        eventPeriod: {
            start: EVENT_START_DATE,
            end: EVENT_END_DATE
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📅 Event period: ${EVENT_START_DATE} to ${EVENT_END_DATE}`);
    console.log(`🏃‍♂️ Multi-Club Leaderboard ready!`);
}); 