import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import google.generativeai as genai
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(tags=["Diet & AI"])
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@router.post("/logs/", response_model=schemas.DailyLogResponse)
def create_log(log: schemas.DailyLogCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    new_log = models.DailyLog(date=log.date, current_weight=log.current_weight, user_id=user.id)
    db.add(new_log); db.commit(); db.refresh(new_log)
    return new_log

@router.get("/logs/")
def get_logs(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.DailyLog).filter(models.DailyLog.user_id == user.id).order_by(models.DailyLog.date.desc()).all()

@router.post("/logs/{log_id}/meals/")
def add_meal(log_id: int, meal: schemas.MealCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    log = db.query(models.DailyLog).filter(models.DailyLog.id == log_id, models.DailyLog.user_id == user.id).first()
    if not log: raise HTTPException(404, "Log not found")
    new_meal = models.Meal(**meal.model_dump(), daily_log_id=log.id)
    db.add(new_meal); db.commit(); db.refresh(new_meal)
    return new_meal

@router.get("/logs/{log_id}/analyze")
def analyze_daily_diet(log_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    log = db.query(models.DailyLog).filter(models.DailyLog.id == log_id, models.DailyLog.user_id == user.id).first()
    meals_str = ", ".join([f"{m.name} ({m.calories}kcal)" for m in log.meals]) if log.meals else "No meals logged."
    
    prompt = f"Analyze intake. Goals: muscle mass. Conditions: {user.medical_conditions}, {user.dietary_preference}, Dislikes: {user.food_dislikes}. Today: {meals_str}. Suggest NEXT culturally appropriate dish in 2 sentences."
    try:
        response = genai.GenerativeModel('gemini-2.5-flash').generate_content(prompt)
        return {"analysis": response.text.strip()}
    except Exception as e: raise HTTPException(500, str(e))

@router.post("/plans/generate", response_model=schemas.DietPlanResponse)
def generate_plan(language: str = "en", db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent = db.query(models.DietPlan).filter(models.DietPlan.user_id == user.id, models.DietPlan.created_at >= seven_days_ago).all()
    if len(recent) >= 2: raise HTTPException(429, "Limit reached: 2 plans per 7 days.")

    target_lang = "Arabic (العربية)" if language == "ar" else "English"
    prompt = f"Write in {target_lang}. Create 7-DAY meal plan. Constraints: {user.medical_conditions}, {user.dietary_preference}, Dislikes: {user.food_dislikes}. Format strictly with Day 1, Breakfast, Lunch, Dinner, Snack."
    try:
        response = genai.GenerativeModel('gemini-2.5-flash').generate_content(prompt)
        new_plan = models.DietPlan(user_id=user.id, content=response.text.strip())
        db.add(new_plan); db.commit(); db.refresh(new_plan)
        return new_plan
    except Exception as e: raise HTTPException(500, str(e))

@router.get("/plans/", response_model=list[schemas.DietPlanResponse])
def get_plans(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.DietPlan).filter(models.DietPlan.user_id == user.id).order_by(models.DietPlan.created_at.desc()).all()