from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    height = Column(Float, nullable=True) 
    country = Column(String, nullable=True)
    preferred_cuisine = Column(String, nullable=True)
    daily_logs = relationship("DailyLog", back_populates="owner")
    diet_plans = relationship("DietPlan", back_populates="owner", cascade="all, delete-orphan")
    
    # --- HEALTH & DIETARY FIELDS ---
    medical_conditions = Column(String, nullable=True)
    dietary_preference = Column(String, nullable=True)
    food_dislikes = Column(String, nullable=True)
    tracked_stocks = Column(String, default="AAPL,MSFT,NVDA,COMI.CA,HRHO.CA")
    # --- FOOTBALL PREFERENCES ---
    national_team = Column(String, nullable=True)
    local_team = Column(String, nullable=True)
    international_team = Column(String, nullable=True)
    
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    


# DailyLog class below the User class
class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # The Foreign Key: This column strictly holds the ID from the "users" table.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # The specific calendar day for this log
    date = Column(Date, nullable=False)
    
    # Track your daily body weight 
    current_weight = Column(Float, nullable=True) 

    # The Python relationship linking back to the User class
    owner = relationship("User", back_populates="daily_logs")
    # The cascade rule ensures cleanup. "delete-orphan" means if a meal is removed 
    # from a daily log, delete it from the database entirely.
    meals = relationship("Meal", back_populates="daily_log", cascade="all, delete-orphan")



class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    
    # The Foreign Key linking this meal to a specific day
    daily_log_id = Column(Integer, ForeignKey("daily_logs.id"), nullable=False)
    
    # What did you eat? (e.g., "Breakfast", "Koshary", "Post-workout Shake")
    name = Column(String, nullable=False) 
    
    # Nutritional Info
    calories = Column(Integer, nullable=False)
    
    # We use Float and default to 0.0 so we don't get errors if you only track calories
    protein = Column(Float, default=0.0) 
    carbs = Column(Float, default=0.0)
    fats = Column(Float, default=0.0)

    # The relationship linking back up to the DailyLog
    daily_log = relationship("DailyLog", back_populates="meals")


class DietPlan(Base):
    __tablename__ = "diet_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="diet_plans")