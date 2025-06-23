const express = require('express');
const axios = require('axios');
const cors = require('cors');
const moment = require('moment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Strava API configuration
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const STRAVA_CLUB_ID = process.env.STRAVA_CLUB_ID;

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

// Function to get club activities
async function getClubActivities() {
    try {
        const token = await getValidAccessToken();
        const response = await axios.get(`https://www.strava.com/api/v3/clubs/${STRAVA_CLUB_ID}/activities`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                per_page: 200
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error fetching club activities:', error.message);
        throw error;
    }
}

// Function to filter virtual run activities
function filterVirtualRunActivities(activities) {
    return activities.filter(activity => {
        const activityDate = moment(activity.start_date).format('YYYY-MM-DD');
        const isInEventPeriod = activityDate >= EVENT_START_DATE && activityDate <= EVENT_END_DATE;
        
        // Filter for running and walking activities.
        const isRunOrWalk = activity.sport_type === 'Run' || activity.sport_type === 'VirtualRun' || activity.sport_type === 'Walk';
        
        return isInEventPeriod && isRunOrWalk;
    });
}

// Function to calculate leaderboard
function calculateLeaderboard(activities) {
    const leaderboard = {};
    
    activities.forEach(activity => {
        const athleteName = activity.athlete.firstname + ' ' + activity.athlete.lastname;
        // Use the athlete's full name as a key since the API doesn't provide a stable ID here.
        const athleteKey = athleteName;
        const distance = activity.distance; // in meters
        const movingTime = activity.moving_time; // in seconds
        
        if (!leaderboard[athleteKey]) {
            leaderboard[athleteKey] = {
                name: athleteName,
                totalDistance: 0,
                totalTime: 0,
                activities: 0,
                averagePace: 0
            };
        }
        
        leaderboard[athleteKey].totalDistance += distance;
        leaderboard[athleteKey].totalTime += movingTime;
        leaderboard[athleteKey].activities += 1;
    });
    
    // Calculate average pace and convert to sorted array
    const leaderboardArray = Object.values(leaderboard).map(athlete => {
        const totalDistanceKm = athlete.totalDistance / 1000;
        const totalTimeHours = athlete.totalTime / 3600;
        athlete.averagePace = totalTimeHours / totalDistanceKm; // hours per km
        athlete.totalDistanceKm = totalDistanceKm;
        athlete.totalTimeHours = totalTimeHours;
        return athlete;
    });
    
    // Sort by total distance (descending)
    return leaderboardArray.sort((a, b) => b.totalDistance - a.totalDistance);
}

// API endpoint to get leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        console.log('Fetching club activities...');
        const activities = await getClubActivities();
        
        console.log(`Found ${activities.length} total activities`);
        const virtualRunActivities = filterVirtualRunActivities(activities);
        
        console.log(`Found ${virtualRunActivities.length} virtual run activities in event period`);
        const leaderboard = calculateLeaderboard(virtualRunActivities);
        
        res.json({
            success: true,
            data: {
                leaderboard,
                eventPeriod: {
                    start: EVENT_START_DATE,
                    end: EVENT_END_DATE
                },
                totalActivities: virtualRunActivities.length,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in leaderboard endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
    console.log(`🏃‍♂️ Virtual Run Leaderboard ready!`);
}); 