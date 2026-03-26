import os
import requests
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError
from datetime import datetime, timedelta, timezone
from app.database import engine, get_db
from app import models, schemas, security # <-- IMPORT security

# Configure the Gemini API securely using the key in your .env file
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dashboard API",
    description="Backend for personal SaaS dashboard",
    version="0.1.0"
)

# --- FOOTBALL API CONFIG ---
FOOTBALL_API_KEY = os.getenv("API_FOOTBALL_KEY")
FOOTBALL_API_URL = "https://v3.football.api-sports.io"

FOOTBALL_HEADERS = {
    "x-apisports-key": FOOTBALL_API_KEY
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Allows your Next.js frontend
    allow_credentials=True,
    allow_methods=["*"], # Allows POST, GET, OPTIONS, etc.
    allow_headers=["*"], # Allows Authorization headers (for our JWT)
)

# This tells FastAPI that the URL to get a token is "/login". 
# It's what makes the "Authorize" padlock button appear in Swagger UI!
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token using our secret key
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except InvalidTokenError:
        # If the token is expired or tampered with, it throws this error
        raise credentials_exception
    
    # Fetch the user from the database
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
        
    return user


# --- NEW PROTECTED ROUTE ---
@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    # Because of the bouncer (get_current_user), if the code reaches here,
    # we are 100% sure the user is valid and authenticated.
    return current_user


# --- NUTRITION & FITNESS ENDPOINTS ---

# 1. Create a new Daily Log
@app.post("/logs/", response_model=schemas.DailyLogResponse)
def create_daily_log(
    log: schemas.DailyLogCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user) # Bouncer!
):
    # Check if a log for this exact date already exists for this user
    existing_log = db.query(models.DailyLog).filter(
        models.DailyLog.user_id == current_user.id,
        models.DailyLog.date == log.date
    ).first()
    
    if existing_log:
        raise HTTPException(status_code=400, detail="A log for this date already exists.")
    
    # Unpack the Pydantic schema and add the current user's ID
    new_log = models.DailyLog(**log.model_dump(), user_id=current_user.id)
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


# 2. Get all Daily Logs for the logged-in user
@app.get("/logs/", response_model=list[schemas.DailyLogResponse])
def get_daily_logs(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Fetch only the logs belonging to the user making the request
    logs = db.query(models.DailyLog).filter(models.DailyLog.user_id == current_user.id).all()
    return logs


# 3. Add a Meal to a specific Daily Log
@app.post("/logs/{log_id}/meals/", response_model=schemas.MealResponse)
def create_meal(
    log_id: int, 
    meal: schemas.MealCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # First, verify the log exists AND belongs to the current user
    log = db.query(models.DailyLog).filter(
        models.DailyLog.id == log_id, 
        models.DailyLog.user_id == current_user.id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Daily log not found or unauthorized.")
    
    # Create the meal and attach it to the log
    new_meal = models.Meal(**meal.model_dump(), daily_log_id=log.id)
    db.add(new_meal)
    db.commit()
    db.refresh(new_meal)
    return new_meal


@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = security.get_password_hash(user.password)
    
    # We now pass all the new personal details into the database model
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        age=user.age,
        gender=user.gender,
        height=user.height,
        country=user.country,
        preferred_cuisine=user.preferred_cuisine,
        medical_conditions=user.medical_conditions,
        dietary_preference=user.dietary_preference,
        food_dislikes=user.food_dislikes,
        national_team=user.national_team,
        local_team=user.local_team,
        international_team=user.international_team
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 specifies 'username' in the form, but we use 'email' for our app
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # If user doesn't exist OR password doesn't match
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # If successful, create the JWT token with the user's email inside it (the "sub" or subject)
    access_token = security.create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/db-test")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Database connected successfully!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running!"}


# 1. Fetch the user's saved plans history
@app.get("/plans/", response_model=list[schemas.DietPlanResponse])
def get_user_plans(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Returns plans ordered by newest first
    return db.query(models.DietPlan).filter(
        models.DietPlan.user_id == current_user.id
    ).order_by(models.DietPlan.created_at.desc()).all()


# 2. Generate a new plan and enforce the 10-plan limit
@app.post("/plans/generate", response_model=schemas.DietPlanResponse)
def generate_and_save_plan(
    language: str = "en",
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # --- NEW: STRICT 7-DAY RATE LIMITING ---
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Fetch plans generated ONLY within the last 7 days
    recent_plans = db.query(models.DietPlan).filter(
        models.DietPlan.user_id == current_user.id,
        models.DietPlan.created_at >= seven_days_ago
    ).order_by(models.DietPlan.created_at.desc()).all()
    
    # If they have generated 2 or more in the last week, hard block the request
    if len(recent_plans) >= 2:
        raise HTTPException(
            status_code=429, 
            detail="Limit reached: You can only generate 2 plans per 7-day period."
        )
    # ---------------------------------------

    # Manage the overall 10-plan history limit
    user_plans = db.query(models.DietPlan).filter(
        models.DietPlan.user_id == current_user.id
    ).order_by(models.DietPlan.created_at.asc()).all()

    if len(user_plans) >= 10:
        db.delete(user_plans[0])
        db.commit()

    # Extract constraints
    age_str = f"{current_user.age}-year-old" if current_user.age else "adult"
    gender_str = current_user.gender or "person"
    height_str = f"{current_user.height} cm tall" if current_user.height else ""
    location_str = f"living in {current_user.country}" if current_user.country else ""
    cuisine_str = f"Preferred Cuisine: {current_user.preferred_cuisine}" if current_user.preferred_cuisine else "No specific cuisine preference."
    
    medical_str = f"MUST ACCOMMODATE MEDICAL CONDITION: {current_user.medical_conditions}." if current_user.medical_conditions else "No specific medical conditions."
    diet_str = f"STRICT DIETARY STYLE: {current_user.dietary_preference}." if current_user.dietary_preference else "No specific diet style."
    dislikes_str = f"DANGER - ALLERGIES/DISLIKES: DO NOT INCLUDE {current_user.food_dislikes} under any circumstances." if current_user.food_dislikes else "No known food allergies."

    target_lang = "Arabic (العربية)" if language == "ar" else "English"

    prompt = f"""
    You are an elite, clinical sports nutritionist. You are designing a custom 7-DAY meal plan for your client.

    [CLIENT PROFILE]
    - Demographics: {age_str} {gender_str}, {height_str}, {location_str}.
    - Goal: Maintain muscle mass and optimize general health.
    - {cuisine_str}

    [CRITICAL CONSTRAINTS - DO NOT IGNORE]
    - {medical_str}
    - {diet_str}
    - {dislikes_str}
    *If a dish traditionally contains an allergen or violates the diet style, you MUST provide a safe, specific alternative/modification.*

    [YOUR TASK]
    1. Write the ENTIRE response in {target_lang}. 
    2. You MUST use the exact formatting structure below. Do not output large paragraphs of text.

    [FORMATTING TEMPLATE]
    **[A brief 1-sentence encouraging opening]**

    ### 📅 Day 1
    * **🍳 Breakfast:** [Dish Name] ([Calories] kcal | [Protein]g)
    * **🥗 Lunch:** [Dish Name] ([Calories] kcal | [Protein]g)
    * **🍗 Dinner:** [Dish Name] ([Calories] kcal | [Protein]g)
    * **🍎 Snack:** [Dish Name] ([Calories] kcal | [Protein]g)
    
    *(Repeat for Days 2 through 7)*

    **💡 Tip of the Week:** [One brief sentence about hydration or prep]
    """

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        new_plan = models.DietPlan(user_id=current_user.id, content=response.text.strip())
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        
        return new_plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")


@app.get("/logs/{log_id}/analyze")
def analyze_daily_diet(
    log_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    log = db.query(models.DailyLog).filter(
        models.DailyLog.id == log_id, 
        models.DailyLog.user_id == current_user.id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    total_cals = sum(m.calories for m in log.meals)
    total_protein = sum(m.protein for m in log.meals)
    total_carbs = sum(m.carbs for m in log.meals)
    total_fats = sum(m.fats for m in log.meals)

    meal_descriptions = [f"{m.name} ({m.calories} kcal, {m.protein}g protein)" for m in log.meals]
    meals_str = ", ".join(meal_descriptions) if meal_descriptions else "No meals logged yet."

    # 1. Extract identical strict profile data
    age_str = f"{current_user.age}-year-old" if current_user.age else "adult"
    gender_str = current_user.gender or "person"
    height_str = f"{current_user.height} cm tall" if current_user.height else ""
    location_str = f"living in {current_user.country}" if current_user.country else ""
    cuisine_str = f"Preferred Cuisine: {current_user.preferred_cuisine}" if current_user.preferred_cuisine else "No specific cuisine preference."
    
    # 2. Extract identical strict constraints
    medical_str = f"MUST ACCOMMODATE MEDICAL CONDITION: {current_user.medical_conditions}." if current_user.medical_conditions else "No specific medical conditions."
    diet_str = f"STRICT DIETARY STYLE: {current_user.dietary_preference}." if current_user.dietary_preference else "No specific diet style."
    dislikes_str = f"DANGER - ALLERGIES/DISLIKES: DO NOT INCLUDE {current_user.food_dislikes} under any circumstances." if current_user.food_dislikes else "No known food allergies."

    # 3. Formulate the daily-specific task with the strict rules
    prompt = f"""
    You are an elite, clinical sports nutritionist. Your job is to analyze your client's daily food intake and suggest their next meal.

    [CLIENT PROFILE]
    - Demographics: {age_str} {gender_str}, {height_str}, {location_str}.
    - Goal: Maintain muscle mass and optimize general health.
    - {cuisine_str}

    [CRITICAL CONSTRAINTS - DO NOT IGNORE]
    - {medical_str}
    - {diet_str}
    - {dislikes_str}

    [TODAY'S LOG]
    - Weight today: {log.current_weight or 'Not recorded'} kg
    - Meals eaten so far: {meals_str}
    - Macros consumed: {total_cals} kcal | {total_protein}g Protein | {total_carbs}g Carbs | {total_fats}g Fats.

    [YOUR TASK]
    1. Write exactly ONE encouraging sentence analyzing their macro progress today.
    2. Write exactly TWO sentences suggesting a specific, culturally appropriate dish for their NEXT meal to optimize their remaining protein and calorie needs.
    3. Ensure the suggested meal STRICTLY OBEYS all medical conditions, dietary styles, and allergies listed above. Provide safe alternatives if necessary.
    """

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return {"analysis": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
    

# --- FOOTBALL ANALYTICS HUB ---

def fetch_team_data(team_name: str):
    """Helper function to search a team and get its matches."""
    if not team_name:
        return None
        
    try:
        # 1. Search for the Team ID and Logo
        search_res = requests.get(
            f"{FOOTBALL_API_URL}/teams", 
            headers=FOOTBALL_HEADERS, 
            params={"search": team_name}
        )
        search_data = search_res.json()
        
        if not search_data.get("response"):
            return {"search_query": team_name, "error": "Team not found in API"}
            
        team_info = search_data["response"][0]["team"]
        team_id = team_info["id"]
        
        # 2. Fetch the Next Fixture
        next_res = requests.get(
            f"{FOOTBALL_API_URL}/fixtures", 
            headers=FOOTBALL_HEADERS, 
            params={"team": team_id, "next": 1}
        )
        next_data = next_res.json()
        
        # 3. Fetch the Last Fixture (Recent Result)
        last_res = requests.get(
            f"{FOOTBALL_API_URL}/fixtures", 
            headers=FOOTBALL_HEADERS, 
            params={"team": team_id, "last": 1}
        )
        last_data = last_res.json()
        
        # Format the fixtures if they exist
        next_match = None
        if next_data.get("response"):
            fix = next_data["response"][0]
            next_match = {
                "date": fix["fixture"]["date"],
                "competition": fix["league"]["name"],
                "home_team": fix["teams"]["home"]["name"],
                "home_logo": fix["teams"]["home"]["logo"],
                "away_team": fix["teams"]["away"]["name"],
                "away_logo": fix["teams"]["away"]["logo"],
            }

        last_match = None
        if last_data.get("response"):
            fix = last_data["response"][0]
            last_match = {
                "date": fix["fixture"]["date"],
                "competition": fix["league"]["name"],
                "home_team": fix["teams"]["home"]["name"],
                "home_logo": fix["teams"]["home"]["logo"],
                "home_score": fix["goals"]["home"],
                "away_team": fix["teams"]["away"]["name"],
                "away_logo": fix["teams"]["away"]["logo"],
                "away_score": fix["goals"]["away"],
            }
            
        return {
            "id": team_id,
            "name": team_info["name"],
            "logo": team_info["logo"],
            "next_match": next_match,
            "last_match": last_match
        }
    except Exception as e:
        return {"search_query": team_name, "error": str(e)}


@app.get("/football/hub")
def get_football_dashboard(current_user: models.User = Depends(get_current_user)):
    """Fetches data for the user's 3 chosen teams."""
    # We use the team names saved in the user's database row!
    return {
        "national_team": fetch_team_data(current_user.national_team),
        "local_team": fetch_team_data(current_user.local_team),
        "international_team": fetch_team_data(current_user.international_team)
    }