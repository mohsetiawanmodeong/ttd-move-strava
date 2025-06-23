import os
from flask import Flask, jsonify, send_from_directory, request
from dotenv import load_dotenv
import requests
from datetime import datetime
from collections import defaultdict
import logging
from flask_cors import CORS
from requests.exceptions import RequestException, Timeout
import json
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

# Validate required environment variables
required_env_vars = [
    'STRAVA_CLIENT_ID',
    'STRAVA_CLIENT_SECRET',
    'STRAVA_REFRESH_TOKEN',
    'STRAVA_CLUB_ID_WOMAN',
    'STRAVA_CLUB_ID_WALK',
    'STRAVA_CLUB_ID_RUN'
]

missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# Strava API config
STRAVA_CLIENT_ID = os.getenv('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.getenv('STRAVA_CLIENT_SECRET')
STRAVA_REFRESH_TOKEN = os.getenv('STRAVA_REFRESH_TOKEN')

logger.info(f"Loaded config - Client ID: {STRAVA_CLIENT_ID}, Club IDs: {os.getenv('STRAVA_CLUB_ID_WOMAN')}, {os.getenv('STRAVA_CLUB_ID_WALK')}, {os.getenv('STRAVA_CLUB_ID_RUN')}")

CLUB_CONFIG = {
    "woman": {
        "id": os.getenv('STRAVA_CLUB_ID_WOMAN'),
        "filter": ["Walk"],
        "name": "TTD MOVE HL 2025 - WOMAN"
    },
    "walk": {
        "id": os.getenv('STRAVA_CLUB_ID_WALK'),
        "filter": ["Walk"],
        "name": "TTD MOVE HL 2025 - WALK"
    },
    "run": {
        "id": os.getenv('STRAVA_CLUB_ID_RUN'),
        "filter": ["Run", "TrailRun"],
        "name": "TTD MOVE HL 2025 - RUN"
    }
}

EVENT_START_DATE = "2025-06-07"
EVENT_END_DATE = "2025-07-06"

access_token = None
token_expiry = None

# Request timeout in seconds
REQUEST_TIMEOUT = 5

# Token cache file
TOKEN_CACHE_FILE = 'token_cache.json'

def load_cached_token():
    try:
        if os.path.exists(TOKEN_CACHE_FILE):
            with open(TOKEN_CACHE_FILE, 'r') as f:
                data = json.load(f)
                if datetime.now().timestamp() < data.get('expires_at', 0):
                    logger.info("Using cached access token")
                    return data.get('access_token'), data.get('expires_at')
    except Exception as e:
        logger.warning(f"Error loading token cache: {e}")
    return None, None

def save_token_cache(access_token, expires_at):
    try:
        with open(TOKEN_CACHE_FILE, 'w') as f:
            json.dump({
                'access_token': access_token,
                'expires_at': expires_at
            }, f)
    except Exception as e:
        logger.warning(f"Error saving token cache: {e}")

def refresh_access_token():
    global access_token, token_expiry
    
    # Try to load from cache first
    cached_token, cached_expiry = load_cached_token()
    if cached_token:
        access_token = cached_token
        token_expiry = cached_expiry
        return access_token
    
    url = "https://www.strava.com/oauth/token"
    logger.debug("Refreshing access token...")
    try:
        resp = requests.post(url, 
            data={
                "client_id": STRAVA_CLIENT_ID,
                "client_secret": STRAVA_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": STRAVA_REFRESH_TOKEN
            },
            timeout=REQUEST_TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        access_token = data['access_token']
        token_expiry = data['expires_at']
        
        # Save to cache
        save_token_cache(access_token, token_expiry)
        
        logger.info("Access token refreshed successfully")
        return access_token
    except Timeout:
        logger.error("Timeout while refreshing access token")
        raise Exception("Timeout while connecting to Strava API")
    except RequestException as e:
        logger.error(f"Error refreshing token: {str(e)}")
        if hasattr(resp, 'text'):
            logger.error(f"Error response from Strava: {resp.text}")
        raise Exception("Failed to refresh Strava access token")

def get_valid_access_token():
    global access_token, token_expiry
    if not access_token or datetime.now().timestamp() >= (token_expiry or 0):
        return refresh_access_token()
    return access_token

# Cache for club activities
activities_cache = {}
CACHE_DURATION = 60  # Cache duration in seconds

def get_club_activities(club_id):
    if not club_id:
        logger.error("Club ID is missing")
        raise ValueError("Club ID is required")
    
    # Check cache first
    cache_key = f"club_{club_id}"
    if cache_key in activities_cache:
        cached_data = activities_cache[cache_key]
        if datetime.now().timestamp() - cached_data['timestamp'] < CACHE_DURATION:
            logger.info(f"Using cached activities for club {club_id}")
            return cached_data['activities']
    
    logger.info(f"Fetching activities for club {club_id}")
    token = get_valid_access_token()
    url = f"https://www.strava.com/api/v3/clubs/{club_id}/activities"
    
    try:
        logger.debug(f"Making request to {url}")
        resp = requests.get(
            url, 
            headers={"Authorization": f"Bearer {token}"}, 
            params={"per_page": 200},
            timeout=REQUEST_TIMEOUT
        )
        resp.raise_for_status()
        
        activities = resp.json()
        
        # Update cache
        activities_cache[cache_key] = {
            'activities': activities,
            'timestamp': datetime.now().timestamp()
        }
        
        logger.info(f"Successfully fetched {len(activities)} activities")
        return activities
        
    except Timeout:
        logger.error(f"Timeout while fetching club activities for club {club_id}")
        raise Exception("Timeout while connecting to Strava API")
    except RequestException as e:
        logger.error(f"Error fetching club activities: {str(e)}")
        if hasattr(resp, 'text'):
            logger.error(f"Error response from Strava: {resp.text}")
        raise Exception(f"Failed to fetch activities from Strava API: {str(e)}")

def filter_activities_by_sport_type(activities, allowed_types):
    logger.info(f"Filtering {len(activities)} activities for types: {allowed_types}")
    filtered = []
    for activity in activities:
        try:
            # Get start date safely with fallback
            activity_date = activity.get('start_date', '')
            if not activity_date:
                logger.warning(f"Activity missing start_date: {activity}")
                continue
                
            # Extract date part only
            if 'T' in activity_date:
                activity_date = activity_date.split('T')[0]
            
            # Check if activity is in event period
            is_in_period = EVENT_START_DATE <= activity_date <= EVENT_END_DATE
            
            # Get sport type safely
            sport_type = activity.get('sport_type', '')
            is_allowed = sport_type in allowed_types
            
            if is_in_period and is_allowed:
                filtered.append(activity)
                logger.debug(f"Including activity: {activity_date} - {sport_type}")
            else:
                logger.debug(f"Excluding activity: {activity_date} - {sport_type} (in period: {is_in_period}, allowed: {is_allowed})")
                
        except Exception as e:
            logger.error(f"Error processing activity: {e}")
            logger.error(f"Problematic activity data: {activity}")
            continue
    
    logger.info(f"Filtered to {len(filtered)} activities")
    return filtered

def calculate_leaderboard(activities):
    logger.info("Calculating leaderboard...")
    leaderboard = defaultdict(lambda: {
        "name": "",
        "totalDistance": 0,
        "totalTime": 0,
        "activities": 0,
        "averagePace": 0,
        "activityList": []
    })
    
    for activity in activities:
        try:
            athlete = activity.get('athlete', {})
            athlete_name = f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip()
            if not athlete_name:
                logger.warning(f"Activity has no athlete name: {activity}")
                continue
                
            entry = leaderboard[athlete_name]
            entry["name"] = athlete_name
            entry["totalDistance"] += float(activity.get('distance', 0))
            entry["totalTime"] += float(activity.get('moving_time', 0))
            entry["activities"] += 1
            
            # Add activity details
            activity_detail = {
                "id": activity.get('id', ''),
                "name": activity.get('name', 'Unnamed Activity'),
                "distance": float(activity.get('distance', 0)),
                "moving_time": float(activity.get('moving_time', 0)),
                "start_date": activity.get('start_date', '')
            }
            entry["activityList"].append(activity_detail)
            
        except Exception as e:
            logger.error(f"Error processing activity for leaderboard: {e}")
            logger.error(f"Problematic activity data: {activity}")
            continue
    
    # Convert to list and calculate additional metrics
    leaderboard_list = []
    for athlete in leaderboard.values():
        try:
            total_km = athlete["totalDistance"] / 1000
            total_hours = athlete["totalTime"] / 3600
            athlete["averagePace"] = total_km and (total_hours / total_km) or 0
            athlete["totalDistanceKm"] = total_km
            athlete["totalTimeHours"] = total_hours
            leaderboard_list.append(athlete)
        except Exception as e:
            logger.error(f"Error calculating metrics for athlete {athlete.get('name')}: {e}")
            continue
    
    # Sort by total distance
    leaderboard_list.sort(key=lambda x: x["totalDistance"], reverse=True)
    logger.info(f"Generated leaderboard with {len(leaderboard_list)} athletes")
    return leaderboard_list

@app.route('/api/leaderboard/<club_type>')
def api_leaderboard(club_type):
    logger.info(f"Received leaderboard request for club type: {club_type}")
    
    try:
        config = CLUB_CONFIG.get(club_type)
        if not config:
            logger.error(f"Invalid club type requested: {club_type}")
            return jsonify({
                "success": False, 
                "error": f"Invalid club type: {club_type}"
            }), 404

        if not config.get("id"):
            logger.error(f"Missing club ID for club type: {club_type}")
            return jsonify({
                "success": False, 
                "error": f"Club ID not configured for {club_type}"
            }), 500
        
        logger.info(f"Using club config: {config}")
        activities = get_club_activities(config["id"])
        logger.info(f"Got {len(activities)} activities before filtering")
        
        filtered = filter_activities_by_sport_type(activities, config["filter"])
        logger.info(f"Filtered to {len(filtered)} activities matching sport types: {config['filter']}")
        
        leaderboard = calculate_leaderboard(filtered)
        logger.info(f"Generated leaderboard with {len(leaderboard)} athletes")
        
        response_data = {
            "success": True,
            "data": {
                "leaderboard": leaderboard,
                "clubName": config["name"],
                "eventPeriod": {
                    "start": EVENT_START_DATE,
                    "end": EVENT_END_DATE
                },
                "totalActivities": len(filtered),
                "lastUpdated": datetime.now().isoformat()
            }
        }
        logger.info("Sending successful response")
        return jsonify(response_data)
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400
    except Exception as e:
        logger.exception("Error processing leaderboard request")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/activity/<activity_id>')
def api_activity(activity_id):
    try:
        token = get_valid_access_token()
        url = f"https://www.strava.com/api/v3/activities/{activity_id}"
        resp = requests.get(url, headers={"Authorization": f"Bearer {token}"})
        resp.raise_for_status()
        return jsonify({"success": True, "data": resp.json()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/health')
def api_health():
    return jsonify({
        "status": "OK",
        "timestamp": datetime.now().isoformat(),
        "eventPeriod": {
            "start": EVENT_START_DATE,
            "end": EVENT_END_DATE
        }
    })

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory('public', path)

if __name__ == '__main__':
    app.run(port=3001, debug=True) 