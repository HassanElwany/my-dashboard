import os, time, requests
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from .. import models
from ..auth import get_current_user

router = APIRouter(prefix="/football", tags=["Sports"])

FOOTBALL_API_KEY = os.getenv("API_FOOTBALL_KEY")
FOOTBALL_API_URL = "https://v3.football.api-sports.io"
FOOTBALL_HEADERS = {"x-apisports-key": FOOTBALL_API_KEY}

API_CACHE = {}
CACHE_TTL = 3600

def fetch_from_api(url: str, params: dict):
    cache_key = f"{url}_{str(params)}"
    if cache_key in API_CACHE and time.time() - API_CACHE[cache_key]['timestamp'] < CACHE_TTL:
        return API_CACHE[cache_key]['data']
    res = requests.get(url, headers=FOOTBALL_HEADERS, params=params)
    data = res.json()
    API_CACHE[cache_key] = {'timestamp': time.time(), 'data': data}
    return data

def fetch_team_data(team_name: str):
    if not team_name: return None
    try:
        data = fetch_from_api(f"{FOOTBALL_API_URL}/teams", {"search": team_name})
        if not data.get("response"): return {"error": "Not found"}
        team = data["response"][0]["team"]
        return {"id": team["id"], "name": team["name"], "logo": team["logo"]}
    except Exception as e: return {"error": str(e)}

@router.get("/hub")
def get_football_dashboard(current_user: models.User = Depends(get_current_user)):
    return {
        "national_team": fetch_team_data(current_user.national_team),
        "local_team": fetch_team_data(current_user.local_team),
        "international_team": fetch_team_data(current_user.international_team)
    }

@router.get("/team/{team_id}/overview")
def get_team_overview(team_id: int):
    data = fetch_from_api(f"{FOOTBALL_API_URL}/teams", {"id": team_id})
    if not data.get("response"): raise HTTPException(404, "Team not found")
    team = data["response"][0]["team"]
    return {"id": team_id, "name": team["name"], "logo": team["logo"]}

@router.get("/team/{team_id}/fixtures")
def get_team_fixtures(team_id: int):
    today = datetime.now(timezone.utc)
    all_matches = []
    for year in [today.year - 1, today.year]:
        data = fetch_from_api(f"{FOOTBALL_API_URL}/fixtures", {"team": team_id, "season": year})
        if data.get("response"): all_matches.extend(data["response"])
    
    matches = []
    for fix in all_matches:
        match_date = datetime.fromisoformat(fix["fixture"]["date"].replace("Z", "+00:00"))
        if match_date > today:
            matches.append({
                "date": fix["fixture"]["date"],
                "competition": fix["league"]["name"],
                "home_team": fix["teams"]["home"]["name"],
                "home_logo": fix["teams"]["home"]["logo"],
                "away_team": fix["teams"]["away"]["name"],
                "away_logo": fix["teams"]["away"]["logo"],
                "timestamp": match_date.timestamp()
            })
    matches.sort(key=lambda x: x["timestamp"])
    return {"fixtures": matches[:5]}

@router.get("/team/{team_id}/squad")
def get_team_squad(team_id: int):
    data = fetch_from_api(f"{FOOTBALL_API_URL}/players/squads", {"team": team_id})
    players = []
    if data.get("response") and data["response"]:
        for p in data["response"][0]["players"]:
            players.append({"id": p["id"], "name": p["name"], "age": p["age"], "number": p.get("number"), "position": p["position"], "photo": p["photo"]})
    return {"squad": players}