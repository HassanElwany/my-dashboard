from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List
# Schema for data coming IN from the frontend (Client -> API)
class UserCreate(BaseModel):
    email: str
    password: str
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    country: Optional[str] = None
    preferred_cuisine: Optional[str] = None
    medical_conditions: Optional[str] = None
    dietary_preference: Optional[str] = None
    food_dislikes: Optional[str] = None
    national_team: Optional[str] = None
    local_team: Optional[str] = None
    international_team: Optional[str] = None
    tracked_stocks: Optional[str] = "AAPL,MSFT,NVDA,COMI.CA,HRHO.CA"

class UserResponse(BaseModel):
    id: int
    email: str
    age: Optional[int]
    gender: Optional[str]
    height: Optional[float]
    country: Optional[str]
    preferred_cuisine: Optional[str]
    medical_conditions: Optional[str]
    dietary_preference: Optional[str]
    food_dislikes: Optional[str]
    national_team: Optional[str]
    local_team: Optional[str]
    international_team: Optional[str]
    tracked_stocks: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

# --- MEAL SCHEMAS ---
class MealCreate(BaseModel):
    name: str
    calories: int
    protein: float = 0.0
    carbs: float = 0.0
    fats: float = 0.0

class MealResponse(BaseModel):
    id: int
    daily_log_id: int
    name: str
    calories: int
    protein: float
    carbs: float
    fats: float

    model_config = ConfigDict(from_attributes=True)


# --- DAILY LOG SCHEMAS ---
class DailyLogCreate(BaseModel):
    date: date
    # Optional because you might not weigh yourself every single day
    current_weight: Optional[float] = None 

class DailyLogResponse(BaseModel):
    id: int
    user_id: int
    date: date
    current_weight: Optional[float]
    
    # This automatically nests the meals inside the daily log JSON!
    meals: List[MealResponse] = []

    model_config = ConfigDict(from_attributes=True)


class DietPlanResponse(BaseModel):
    id: int
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)