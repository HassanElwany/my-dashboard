import os
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError

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
        preferred_cuisine=user.preferred_cuisine
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
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # 1. Check how many plans the user currently has
    user_plans = db.query(models.DietPlan).filter(
        models.DietPlan.user_id == current_user.id
    ).order_by(models.DietPlan.created_at.asc()).all()

    # If they have 10 or more, delete the oldest one (FIFO)
    if len(user_plans) >= 10:
        db.delete(user_plans[0])
        db.commit()

    # 2. Extract personal details for the prompt
    age_str = f"{current_user.age}-year-old" if current_user.age else "adult"
    gender_str = current_user.gender or "person"
    height_str = f"{current_user.height} cm tall" if current_user.height else ""
    location_str = f"living in {current_user.country}" if current_user.country else ""
    cuisine_str = f"They strongly prefer {current_user.preferred_cuisine} cuisine." if current_user.preferred_cuisine else ""

    prompt = f"""
    Act as an expert sports nutritionist. Your client is a {age_str} {gender_str}, {height_str}, {location_str}. 
    They want to maintain muscle mass and general health.
    {cuisine_str}
    
    Provide a highly structured, 1-day sample meal plan (Breakfast, Lunch, Dinner, and one Snack). 
    Suggest specific, culturally relevant dishes. Include estimated calories and protein for each meal.
    """

    # 3. Call Gemini and save the result to the database
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        new_plan = models.DietPlan(user_id=current_user.id, content=response.text)
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
    # 1. Fetch the specific daily log and verify ownership
    log = db.query(models.DailyLog).filter(
        models.DailyLog.id == log_id, 
        models.DailyLog.user_id == current_user.id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    # 2. Calculate the totals
    total_cals = sum(m.calories for m in log.meals)
    total_protein = sum(m.protein for m in log.meals)
    total_carbs = sum(m.carbs for m in log.meals)
    total_fats = sum(m.fats for m in log.meals)

    meal_descriptions = [f"{m.name} ({m.calories} kcal, {m.protein}g protein)" for m in log.meals]
    meals_str = ", ".join(meal_descriptions) if meal_descriptions else "No meals logged yet."

    # 3. Extract the user's personal details gracefully (in case they left fields blank)
    age_str = f"{current_user.age}-year-old" if current_user.age else "adult"
    gender_str = current_user.gender or "person"
    location_str = f"living in {current_user.country}" if current_user.country else ""
    cuisine_str = f"They prefer {current_user.preferred_cuisine} cuisine." if current_user.preferred_cuisine else ""

    # 4. Construct the DYNAMIC prompt
    prompt = f"""
    Act as an expert sports nutritionist. Your client is a {age_str} {gender_str} {location_str}, focused on maintaining muscle mass and general health.
    {cuisine_str}
    
    Today's Log:
    Weight: {log.current_weight or 'Not recorded'} kg
    Meals eaten so far: {meals_str}
    Total Macros: {total_cals} kcal, {total_protein}g Protein, {total_carbs}g Carbs, {total_fats}g Fats.

    Provide a brief, encouraging 2-sentence analysis of their day so far. 
    Then, suggest ONE specific, culturally appropriate dish they could eat for their next meal to optimize their protein intake based on their preferences. Keep the entire response under 4 sentences.
    """

    # 5. Call the Gemini API
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")