# 📘 BACKEND MANUAL — Lumina API

---

## 1. PROJECT OVERVIEW

**Lumina API** is a personal lifestyle dashboard backend that provides authenticated REST API endpoints for tracking diet & nutrition, following football (soccer) teams, and monitoring stock market data.

**Target users:** Individual users who want a unified hub to manage their daily nutrition logs, football team schedules, and financial portfolio — all personalized to their preferences.

### Tech Stack

| Layer              | Technology                     | Version / Notes                        |
|--------------------|--------------------------------|----------------------------------------|
| Language           | Python                         | 3.x                                    |
| Web Framework      | FastAPI                        | Latest                                 |
| ASGI Server        | Uvicorn                        | With standard extras                   |
| ORM                | SQLAlchemy                     | Latest                                 |
| Database           | PostgreSQL 15                  | Dockerized via `postgres:15-alpine`    |
| DB Driver          | psycopg2-binary                | —                                      |
| Authentication     | JWT (HS256)                    | via PyJWT + bcrypt                     |
| AI Integration     | Google Gemini 2.5 Flash        | `google-generativeai` SDK              |
| Sports Data        | API-Football v3                | `https://v3.football.api-sports.io`    |
| Stock Market Data  | Yahoo Finance                  | `yfinance` library                     |
| News Feed          | Yahoo Finance RSS              | Parsed via `xml.etree.ElementTree`     |
| Containerization   | Docker / Docker Compose        | Postgres only (app runs natively)      |
| Config Management  | python-dotenv                  | `.env` file                            |

---

## 2. ARCHITECTURE MAP

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│                    http://localhost:3000                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │  HTTP Requests (Bearer Token)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Application                          │
│                   "Lumina API" (Uvicorn)                        │
│                    http://localhost:8000                         │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │  /users   │  │  /logs    │  │ /football │  │  /finance  │  │
│  │  /token   │  │  /plans   │  │  (sports) │  │            │  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └──────┬─────┘  │
│        │              │              │                │         │
│  ┌─────▼──────────────▼──────┐  ┌───▼────────────────▼──────┐  │
│  │     auth.py / security.py │  │      External APIs         │  │
│  │  (JWT verification, bcrypt│  │  • Google Gemini 2.5 Flash │  │
│  │   password hashing)       │  │  • API-Football v3         │  │
│  └───────────────────────────┘  │  • Yahoo Finance / RSS     │  │
│                                 └────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  SQLAlchemy ORM                           │  │
│  │          models.py  ◄──►  schemas.py                      │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                          ▼ TCP 5432
┌─────────────────────────────────────────────────────────────────┐
│                 PostgreSQL 15 (Docker Container)                 │
│                    dashboard_db                                  │
│              Tables: users, daily_logs, meals, diet_plans        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Request → Response

```
Client Request
     │
     ▼
[FastAPI Router] ──► [auth.py: get_current_user()]
                              │
                    Decode JWT Token → Query users table
                              │
                    ──── Valid? ────────────────────
                    │ Yes                          │ No
                    ▼                              ▼
         [Route Handler]                   HTTP 401 Unauthorized
                    │
         ┌──────────┴──────────┐
         │ DB Query (if needed)│
         │ External API call   │
         │ AI generation       │
         └──────────┬──────────┘
                    │
                    ▼
         [Pydantic Schema Serialization]
                    │
                    ▼
              JSON Response
```

### External Dependencies Map

```
Lumina API
├── Google Gemini 2.5 Flash  ← GEMINI_API_KEY
│   └── Used by: /plans/generate, /logs/{id}/analyze
│
├── API-Football v3          ← API_FOOTBALL_KEY
│   └── Used by: /football/hub, /football/team/{id}/*
│
├── Yahoo Finance (yfinance) ← No API key (rate-limited)
│   └── Used by: /finance/quotes, /finance/stock/{symbol}
│
└── Yahoo Finance RSS        ← No API key (public RSS)
    └── Used by: /finance/stock/{symbol} (news section)
```

---

## 3. FILE-BY-FILE DOCUMENTATION

---

### `backend/.env`

**Purpose:** Stores all secret credentials and environment-specific configuration variables.

**What It Does:**
- Provides credentials read by `python-dotenv` at app startup
- Keeps secrets out of source code (should be in `.gitignore`)

**Code Walkthrough:**
```env
# PostgreSQL connection string — format: postgresql://user:password@host:port/dbname
DATABASE_URL=postgresql://admin:secretpassword@localhost:5432/dashboard

# Secret key used to sign and verify JWT tokens. MUST be changed in production.
SECRET_KEY=my-super-secret-dashboard-key-2026

# Google Gemini API key for AI-powered diet analysis and plan generation
GEMINI_API_KEY=AIzaSyDOJsxyjpQLe4t0iZevx9_q6nlxmuJImg0

# API-Football key for fetching live football team and fixture data
API_FOOTBALL_KEY=2ce0f8da2726a9340401499d6ce1eb77
```

> ⚠️ **SECURITY WARNING:** This file contains live API keys. It must **never** be committed to Git. Rotate these keys immediately if they are ever exposed publicly.

---

### `backend/requirements.txt`

**Purpose:** Lists all Python package dependencies for the project.

**What It Does:**
- Used by `pip install -r requirements.txt` to install dependencies
- Defines the entire runtime dependency surface

**Code Walkthrough:**
```txt
fastapi            # The web framework — defines routes, validation, and OpenAPI docs
uvicorn[standard]  # ASGI server that runs FastAPI. [standard] adds websocket + speed extras
sqlalchemy         # ORM for defining models and querying PostgreSQL
psycopg2-binary    # PostgreSQL database driver (binary = no system-level C compiler needed)
python-dotenv      # Reads variables from the .env file into os.environ
bcrypt             # Low-level bcrypt hashing library for password security
PyJWT              # Encodes and decodes JWT tokens for authentication
python-multipart   # Required for FastAPI to handle OAuth2 form data (login forms)
google-generativeai # Google Gemini SDK for AI-powered content generation
```

> **Note:** `yfinance`, `requests`, and other libraries used in routers may be missing from this file — verify with `pip freeze` in the venv.

---

### `backend/app/main.py`

**Purpose:** Application entry point — creates the FastAPI instance, registers middleware, and mounts all routers.

**What It Does:**
- Initializes the FastAPI app with the name `"Lumina API"`
- Creates all database tables on startup (auto-migration via SQLAlchemy)
- Configures CORS to allow all origins (suitable for development)
- Registers the four feature routers

**Code Walkthrough:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine

# Import each feature module's router
from .routers import users, diet, sports, finance

# AUTO-MIGRATION: On startup, SQLAlchemy compares models to the DB
# and creates any missing tables. Does NOT drop or modify existing ones.
models.Base.metadata.create_all(bind=engine)

# Create the main application instance. The title appears in /docs.
app = FastAPI(title="Lumina API")

# CORS Middleware: Allows the Next.js frontend (a different origin)
# to make requests to this API without being blocked by the browser.
# ⚠️ allow_origins=["*"] is too permissive for production — restrict to your domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Allow ALL origins
    allow_credentials=True,    # Allow cookies/auth headers
    allow_methods=["*"],       # Allow ALL HTTP methods
    allow_headers=["*"],       # Allow ALL request headers
)

# Mount each domain router onto the main app.
# Endpoints from each router become top-level routes.
app.include_router(users.router)    # Handles /users/, /token, /users/me
app.include_router(diet.router)     # Handles /logs/, /plans/
app.include_router(sports.router)   # Handles /football/...
app.include_router(finance.router)  # Handles /finance/...
```

---

### `backend/app/database.py`

**Purpose:** Configures the SQLAlchemy database engine, session factory, and the declarative base class for all models.

**What It Does:**
- Reads `DATABASE_URL` from `.env`
- Creates a connection pool (`engine`) to PostgreSQL
- Provides a `get_db()` generator used as a FastAPI dependency to inject database sessions into route handlers

**Code Walkthrough:**
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()  # Pull all values from .env into os.environ

# Read the full connection string, e.g.:
# "postgresql://admin:secretpassword@localhost:5432/dashboard"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Engine = the persistent connection pool to the database.
# SQLAlchemy manages the pool internally.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# SessionLocal is a factory. Each call to SessionLocal() creates a new
# database session. Sessions are not shared between requests.
# autocommit=False → we manually call db.commit() after mutations.
# autoflush=False  → SQLAlchemy won't auto-flush pending changes before queries.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All model classes inherit from Base. This allows SQLAlchemy to know
# which classes correspond to database tables.
Base = declarative_base()

# Dependency Injection Pattern:
# FastAPI calls get_db() for any route that has `db: Session = Depends(get_db)`.
# The `yield` makes it a context manager — the `finally` block guarantees
# db.close() runs even if the request throws an exception.
def get_db():
    db = SessionLocal()   # Open a new session
    try:
        yield db          # Hand the session to the route handler
    finally:
        db.close()        # Always close when done — returns connection to the pool
```

---

### `backend/app/models.py`

**Purpose:** Defines all SQLAlchemy ORM models — the Python representation of database tables.

**What It Does:**
- Maps four database tables: `users`, `daily_logs`, `meals`, `diet_plans`
- Defines relationships between tables (one-to-many)
- Uses cascade rules to handle orphan cleanup

**Code Walkthrough:**
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# ─────────────────────────────────────────────
# TABLE: users
# The central model. Every other table references this via user_id.
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)  # Login identifier
    hashed_password = Column(String, nullable=False)                  # bcrypt hash

    # --- Profile fields (all optional, set during registration or update) ---
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    height = Column(Float, nullable=True)        # In cm
    country = Column(String, nullable=True)
    preferred_cuisine = Column(String, nullable=True)

    # --- Health & Diet preferences (used to personalize AI prompts) ---
    medical_conditions = Column(String, nullable=True)   # e.g., "diabetes, lactose intolerant"
    dietary_preference = Column(String, nullable=True)   # e.g., "vegetarian", "halal"
    food_dislikes = Column(String, nullable=True)        # e.g., "liver, okra"

    # --- Finance: comma-separated stock symbols stored as plain string ---
    tracked_stocks = Column(String, default="AAPL,MSFT,NVDA,COMI.CA,HRHO.CA")

    # --- Football preferences (used to fetch team data from API-Football) ---
    national_team = Column(String, nullable=True)       # e.g., "Egypt"
    local_team = Column(String, nullable=True)          # e.g., "Al Ahly"
    international_team = Column(String, nullable=True)  # e.g., "Real Madrid"

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # One user → many daily_logs. SQLAlchemy loads related objects automatically.
    daily_logs = relationship("DailyLog", back_populates="owner")
    # cascade="all, delete-orphan": if a user is deleted, their diet plans are too.
    diet_plans = relationship("DietPlan", back_populates="owner", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# TABLE: daily_logs
# One entry per calendar day per user. Acts as the container for meals.
# ─────────────────────────────────────────────
class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Owner reference
    date = Column(Date, nullable=False)                                 # e.g., 2026-03-30
    current_weight = Column(Float, nullable=True)                       # Optional body weight (kg)

    owner = relationship("User", back_populates="daily_logs")
    # cascade here ensures: if you delete a DailyLog, its meals are deleted too.
    meals = relationship("Meal", back_populates="daily_log", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# TABLE: meals
# Individual food entries belonging to a daily log.
# ─────────────────────────────────────────────
class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    daily_log_id = Column(Integer, ForeignKey("daily_logs.id"), nullable=False)

    name = Column(String, nullable=False)      # e.g., "Koshary", "Grilled Chicken"
    calories = Column(Integer, nullable=False)  # Required macro
    protein = Column(Float, default=0.0)        # Grams of protein
    carbs = Column(Float, default=0.0)          # Grams of carbohydrates
    fats = Column(Float, default=0.0)           # Grams of fat

    daily_log = relationship("DailyLog", back_populates="meals")


# ─────────────────────────────────────────────
# TABLE: diet_plans
# AI-generated weekly diet plans. Stored per user with a timestamp.
# ─────────────────────────────────────────────
class DietPlan(Base):
    __tablename__ = "diet_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)   # Full AI-generated plan text (Markdown)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="diet_plans")
```

**Entity Relationship Diagram:**
```
users (1) ──< daily_logs (1) ──< meals
  └──────────────────────────────< diet_plans
```

---

### `backend/app/schemas.py`

**Purpose:** Pydantic models for request validation (input) and response serialization (output).

**What It Does:**
- Validates incoming JSON body data before it reaches route handlers
- Serializes SQLAlchemy ORM objects into clean JSON for responses
- Separates the API contract from the database schema

**Code Walkthrough:**
```python
from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List

# ── INPUT SCHEMAS (Client → API) ──────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str                               # Plain text — hashed before DB storage
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

class MealCreate(BaseModel):
    name: str
    calories: int
    protein: float = 0.0
    carbs: float = 0.0
    fats: float = 0.0

class DailyLogCreate(BaseModel):
    date: date                          # Python date object (YYYY-MM-DD)
    current_weight: Optional[float] = None

# ── OUTPUT SCHEMAS (API → Client) ─────────────────────────────────

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

    # from_attributes=True: Allows Pydantic to read data from SQLAlchemy ORM objects
    # (not just plain dicts). Required for any schema that serializes ORM models.
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str   # The JWT string
    token_type: str     # Always "bearer"

class MealResponse(BaseModel):
    id: int
    daily_log_id: int
    name: str
    calories: int
    protein: float
    carbs: float
    fats: float
    model_config = ConfigDict(from_attributes=True)

class DailyLogResponse(BaseModel):
    id: int
    user_id: int
    date: date
    current_weight: Optional[float]
    # Nested list: meals are auto-included in the DailyLog JSON response.
    # SQLAlchemy loads them via the `meals` relationship defined in models.py.
    meals: List[MealResponse] = []
    model_config = ConfigDict(from_attributes=True)

class DietPlanResponse(BaseModel):
    id: int
    content: str        # Full Markdown text of the AI-generated plan
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
```

---

### `backend/app/security.py`

**Purpose:** Low-level cryptographic utilities for password hashing and JWT token creation.

**What It Does:**
- Wraps the `bcrypt` library for secure password hashing and verification
- Creates signed JWT access tokens using `PyJWT`
- Tokens are valid for **7 days** (vs. 30 minutes in `auth.py` — see note below)

**Code Walkthrough:**
```python
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = "HS256"                    # HMAC with SHA-256 — symmetric, fast, and standard
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # = 10,080 minutes = 7 days

def get_password_hash(password: str) -> str:
    """
    Hashes a plain text password using bcrypt.
    bcrypt.gensalt() generates a random salt, making identical passwords
    produce different hashes — protects against rainbow table attacks.
    Returns a UTF-8 string suitable for database storage.
    """
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a login attempt. bcrypt.checkpw internally re-extracts
    the salt from the stored hash and compares — constant-time comparison.
    Returns True if the password matches, False otherwise.
    """
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

def create_access_token(data: dict):
    """
    Creates a signed JWT.
    - Copies the payload data (e.g., {"sub": "user@email.com"})
    - Adds an "exp" (expiry) claim so the token self-expires
    - Signs it with SECRET_KEY using HS256
    Returns a compact JWT string: header.payload.signature
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

> ⚠️ **DUPLICATION NOTE:** `auth.py` contains similar but slightly different functions (using `passlib` + `jose` instead of `bcrypt` + `PyJWT`). The **active** functions used by the routers are those imported from `auth.py`. `security.py` appears to be a legacy or alternative implementation. Consider consolidating.

---

### `backend/app/auth.py`

**Purpose:** The active authentication layer — JWT verification, password utilities, and the `get_current_user` FastAPI dependency.

**What It Does:**
- Verifies JWT tokens on protected routes via `get_current_user()`
- Provides password hashing/verification used in the users router
- Acts as the security gate for all protected API endpoints

**Code Walkthrough:**
```python
import os
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from . import models
from .database import get_db

SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# CryptContext manages password hashing schemes. "bcrypt" is the active scheme.
# deprecated="auto" means older schemes are automatically marked deprecated.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2PasswordBearer tells FastAPI where to find the token.
# tokenUrl="token" means clients POST to /token to get a token.
# FastAPI uses this to auto-generate the "Authorize" button in /docs.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    """Uses passlib to verify a password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Uses passlib to hash a plain password with bcrypt."""
    return pwd_context.hash(password)

def create_access_token(data: dict):
    """
    Creates a JWT. Token expires in ACCESS_TOKEN_EXPIRE_MINUTES (default 30 min).
    The payload `data` usually contains {"sub": "user@email.com"}.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    FastAPI Dependency — the security gate for protected routes.
    
    Flow:
    1. FastAPI extracts the Bearer token from the Authorization header.
    2. Decode the JWT using SECRET_KEY — raises JWTError if invalid/expired.
    3. Extract the "sub" claim (the user's email).
    4. Query the DB to confirm the user still exists.
    5. Return the User ORM object → injected into the route via Depends().
    
    Any failure raises HTTP 401 Unauthorized.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")       # "sub" = subject = the user identifier
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Verify the user actually exists in the database (handle deleted accounts)
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
```

---

### `backend/app/routers/users.py`

**Purpose:** Handles user registration, login (token issuance), and profile retrieval.

**What It Does:**
- Exposes 3 endpoints: register, login, and get-my-profile
- Password is never stored in plain text
- Login returns a JWT that must be used for all subsequent requests

**API Endpoints:**

| Method | Path         | Auth Required | Description                          |
|--------|--------------|---------------|--------------------------------------|
| POST   | `/users/`    | ❌ No          | Register a new user account          |
| POST   | `/token`     | ❌ No          | Login — returns a JWT access token   |
| GET    | `/users/me`  | ✅ Yes         | Get the current user's profile       |

**Code Walkthrough:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(tags=["Users"])

# POST /users/ — Registration endpoint
# Input: UserCreate schema (email + password + optional profile fields)
# Output: UserResponse schema (full profile, no password)
@router.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Guard: reject duplicate emails
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # model_dump(exclude={'password'}) converts Pydantic model to dict, removing 'password'
    # We then add hashed_password separately — password NEVER goes to the DB in plain text
    new_user = models.User(
        **user.model_dump(exclude={'password'}),
        hashed_password=get_password_hash(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)  # Reload from DB to populate auto-generated fields (id, created_at)
    return new_user

# POST /token — Login endpoint (OAuth2 compatible form data)
# Input: form_data.username (email) + form_data.password
# Output: {"access_token": "<JWT>", "token_type": "bearer"}
@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    # Verify both existence and password match before issuing token
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    # The "sub" (subject) claim stores the user's email for later lookup in get_current_user()
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer"}

# GET /users/me — Profile endpoint
# No DB query here — get_current_user() already fetched the user object
# Input: Authorization: Bearer <token> header
# Output: UserResponse schema
@router.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user
```

---

### `backend/app/routers/diet.py`

**Purpose:** Manages all diet tracking functionality: daily food logs, meal entries, AI-powered diet analysis, and AI-generated weekly meal plans.

**What It Does:**
- CRUD for daily logs and their nested meals
- Integrates with **Google Gemini 2.5 Flash** for personalized AI analysis
- Enforces a rate limit of 2 AI-generated plans per 7 days per user

**API Endpoints:**

| Method | Path                        | Auth | Description                                  |
|--------|-----------------------------|------|----------------------------------------------|
| POST   | `/logs/`                    | ✅   | Create a new daily log for a specific date   |
| GET    | `/logs/`                    | ✅   | Get all daily logs for the current user      |
| POST   | `/logs/{log_id}/meals/`     | ✅   | Add a meal entry to a specific daily log     |
| GET    | `/logs/{log_id}/analyze`    | ✅   | AI analysis of a day's meals (Gemini)        |
| POST   | `/plans/generate`           | ✅   | Generate a 7-day AI meal plan (Gemini)       |
| GET    | `/plans/`                   | ✅   | Get all previously generated meal plans      |

**Code Walkthrough:**
```python
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import google.generativeai as genai
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(tags=["Diet & AI"])

# Configure Gemini SDK with the API key from .env
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# POST /logs/ — Create a daily log
# Ownership is enforced: user_id comes from the JWT, not the request body.
@router.post("/logs/", response_model=schemas.DailyLogResponse)
def create_log(log: schemas.DailyLogCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    new_log = models.DailyLog(date=log.date, current_weight=log.current_weight, user_id=user.id)
    db.add(new_log); db.commit(); db.refresh(new_log)
    return new_log

# GET /logs/ — Fetch all logs for the current user, newest first
@router.get("/logs/")
def get_logs(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.DailyLog)\
             .filter(models.DailyLog.user_id == user.id)\
             .order_by(models.DailyLog.date.desc())\
             .all()

# POST /logs/{log_id}/meals/ — Add a meal to a log
# Guards: verifies the log exists AND belongs to the requesting user (prevents IDOR)
@router.post("/logs/{log_id}/meals/")
def add_meal(log_id: int, meal: schemas.MealCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    log = db.query(models.DailyLog).filter(
        models.DailyLog.id == log_id,
        models.DailyLog.user_id == user.id  # ← ownership check
    ).first()
    if not log: raise HTTPException(404, "Log not found")
    new_meal = models.Meal(**meal.model_dump(), daily_log_id=log.id)
    db.add(new_meal); db.commit(); db.refresh(new_meal)
    return new_meal

# GET /logs/{log_id}/analyze — AI nutrition analysis using Gemini
# Crafts a personalized prompt using the user's health profile and today's meals
@router.get("/logs/{log_id}/analyze")
def analyze_daily_diet(log_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    log = db.query(models.DailyLog).filter(
        models.DailyLog.id == log_id,
        models.DailyLog.user_id == user.id
    ).first()
    # Format meals list: "Koshary (550kcal), Grilled Chicken (300kcal)"
    meals_str = ", ".join([f"{m.name} ({m.calories}kcal)" for m in log.meals]) if log.meals else "No meals logged."
    
    # Personalized prompt: injects user's medical conditions, dietary preferences, and dislikes
    # Asks Gemini to suggest the NEXT culturally appropriate dish in 2 sentences
    prompt = f"Analyze intake. Goals: muscle mass. Conditions: {user.medical_conditions}, {user.dietary_preference}, Dislikes: {user.food_dislikes}. Today: {meals_str}. Suggest NEXT culturally appropriate dish in 2 sentences."
    try:
        response = genai.GenerativeModel('gemini-2.5-flash').generate_content(prompt)
        return {"analysis": response.text.strip()}
    except Exception as e:
        raise HTTPException(500, str(e))

# POST /plans/generate — Generate a full 7-day AI meal plan
# RATE LIMIT: Max 2 plans per 7-day window per user (enforced in the DB)
# Query param: ?language=ar generates the plan in Arabic
@router.post("/plans/generate", response_model=schemas.DietPlanResponse)
def generate_plan(language: str = "en", db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent = db.query(models.DietPlan).filter(
        models.DietPlan.user_id == user.id,
        models.DietPlan.created_at >= seven_days_ago
    ).all()
    if len(recent) >= 2:
        raise HTTPException(429, "Limit reached: 2 plans per 7 days.")

    target_lang = "Arabic (العربية)" if language == "ar" else "English"
    prompt = f"Write in {target_lang}. Create 7-DAY meal plan. Constraints: {user.medical_conditions}, {user.dietary_preference}, Dislikes: {user.food_dislikes}. Format strictly with Day 1, Breakfast, Lunch, Dinner, Snack."
    try:
        response = genai.GenerativeModel('gemini-2.5-flash').generate_content(prompt)
        new_plan = models.DietPlan(user_id=user.id, content=response.text.strip())
        db.add(new_plan); db.commit(); db.refresh(new_plan)
        return new_plan
    except Exception as e:
        raise HTTPException(500, str(e))

# GET /plans/ — Retrieve all stored plans, newest first
@router.get("/plans/", response_model=list[schemas.DietPlanResponse])
def get_plans(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.DietPlan)\
             .filter(models.DietPlan.user_id == user.id)\
             .order_by(models.DietPlan.created_at.desc())\
             .all()
```

---

### `backend/app/routers/sports.py`

**Purpose:** Provides football data by proxying requests to the **API-Football v3** service with in-memory response caching.

**What It Does:**
- Fetches the user's favorite team data (national, local, international) from API-Football
- Retrieves upcoming fixtures for a team (next 5 matches)
- Retrieves the full squad (player list) for a team
- In-memory cache (TTL = 1 hour) prevents excessive API calls and respects rate limits

**API Endpoints:**

| Method | Path                          | Auth | Description                                          |
|--------|-------------------------------|------|------------------------------------------------------|
| GET    | `/football/hub`               | ✅   | Returns all 3 of user's teams with basic info        |
| GET    | `/football/team/{team_id}/overview` | ❌ | Get team name and logo by ID               |
| GET    | `/football/team/{team_id}/fixtures` | ❌ | Get next 5 upcoming matches for a team     |
| GET    | `/football/team/{team_id}/squad`    | ❌ | Get the full player squad for a team       |

**Code Walkthrough:**
```python
import os, time, requests
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from .. import models
from ..auth import get_current_user

router = APIRouter(prefix="/football", tags=["Sports"])

FOOTBALL_API_KEY = os.getenv("API_FOOTBALL_KEY")
FOOTBALL_API_URL = "https://v3.football.api-sports.io"
FOOTBALL_HEADERS = {"x-apisports-key": FOOTBALL_API_KEY}

# In-memory cache: a plain Python dict keyed by request fingerprint
# Not persistent — resets every time the server restarts
API_CACHE = {}
CACHE_TTL = 3600  # 1 hour in seconds

def fetch_from_api(url: str, params: dict):
    """
    Generic cached HTTP GET to API-Football.
    Cache key = URL + params string (unique per request type).
    If the cache entry exists and is younger than 1 hour, return it.
    Otherwise make the HTTP call, cache the result, and return it.
    """
    cache_key = f"{url}_{str(params)}"
    if cache_key in API_CACHE and time.time() - API_CACHE[cache_key]['timestamp'] < CACHE_TTL:
        return API_CACHE[cache_key]['data']
    res = requests.get(url, headers=FOOTBALL_HEADERS, params=params)
    data = res.json()
    API_CACHE[cache_key] = {'timestamp': time.time(), 'data': data}
    return data

def fetch_team_data(team_name: str):
    """
    Searches API-Football by team name string. Returns {id, name, logo}.
    Used by /football/hub to resolve team names stored in the user profile
    into their numeric API team IDs and logo URLs.
    Returns None if team_name is empty, {"error": ...} on failure.
    """
    if not team_name: return None
    try:
        data = fetch_from_api(f"{FOOTBALL_API_URL}/teams", {"search": team_name})
        if not data.get("response"): return {"error": "Not found"}
        team = data["response"][0]["team"]
        return {"id": team["id"], "name": team["name"], "logo": team["logo"]}
    except Exception as e: return {"error": str(e)}

# GET /football/hub — Dashboard endpoint for the user's 3 teams
# Calls fetch_team_data for each team preference stored in the user's profile
@router.get("/hub")
def get_football_dashboard(current_user: models.User = Depends(get_current_user)):
    return {
        "national_team": fetch_team_data(current_user.national_team),
        "local_team": fetch_team_data(current_user.local_team),
        "international_team": fetch_team_data(current_user.international_team)
    }

# GET /football/team/{team_id}/fixtures — Next 5 upcoming matches
# Fetches fixtures for both the current and previous season to handle season transitions.
# Filters to only future matches, sorts chronologically, returns top 5.
@router.get("/team/{team_id}/fixtures")
def get_team_fixtures(team_id: int):
    today = datetime.now(timezone.utc)
    all_matches = []
    for year in [today.year - 1, today.year]:   # Fetch two seasons to avoid gaps
        data = fetch_from_api(f"{FOOTBALL_API_URL}/fixtures", {"team": team_id, "season": year})
        if data.get("response"): all_matches.extend(data["response"])
    
    matches = []
    for fix in all_matches:
        match_date = datetime.fromisoformat(fix["fixture"]["date"].replace("Z", "+00:00"))
        if match_date > today:   # Only future matches
            matches.append({
                "date": fix["fixture"]["date"],
                "competition": fix["league"]["name"],
                "home_team": fix["teams"]["home"]["name"],
                "home_logo": fix["teams"]["home"]["logo"],
                "away_team": fix["teams"]["away"]["name"],
                "away_logo": fix["teams"]["away"]["logo"],
                "timestamp": match_date.timestamp()  # For client-side sorting/display
            })
    matches.sort(key=lambda x: x["timestamp"])  # Chronological order
    return {"fixtures": matches[:5]}             # Return only the next 5

# GET /football/team/{team_id}/squad — Get full player roster
@router.get("/team/{team_id}/squad")
def get_team_squad(team_id: int):
    data = fetch_from_api(f"{FOOTBALL_API_URL}/players/squads", {"team": team_id})
    players = []
    if data.get("response") and data["response"]:
        for p in data["response"][0]["players"]:
            players.append({
                "id": p["id"],
                "name": p["name"],
                "age": p["age"],
                "number": p.get("number"),   # .get() because number may be null
                "position": p["position"],
                "photo": p["photo"]
            })
    return {"squad": players}
```

---

### `backend/app/routers/finance.py`

**Purpose:** Provides real-time stock market data and financial news by wrapping the `yfinance` library and Yahoo Finance RSS feeds, with in-memory caching.

**What It Does:**
- Returns live quotes for the user's personalized list of tracked stocks
- Returns detailed candlestick OHLC data for any stock across multiple time periods
- Fetches the latest 5 news headlines for any stock from Yahoo Finance RSS
- In-memory cache (TTL = 5 minutes) reduces redundant API calls

**API Endpoints:**

| Method | Path                        | Auth | Description                                              |
|--------|-----------------------------|------|----------------------------------------------------------|
| GET    | `/finance/quotes`           | ✅   | Get live quotes for all of user's tracked stocks         |
| GET    | `/finance/stock/{symbol}`   | ❌   | Get candlestick data + news + profile for a single stock |

**Code Walkthrough:**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import yfinance as yf
import time
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from .. import models
from ..auth import get_current_user

router = APIRouter(prefix="/finance", tags=["Finance"])

# Cache entries expire after 5 minutes (300 seconds)
FINANCE_CACHE = {}
CACHE_TTL = 300

def get_cached_data(key: str):
    """Returns cached data if it exists and is fresh. Returns None on cache miss."""
    if key in FINANCE_CACHE and time.time() - FINANCE_CACHE[key]['timestamp'] < CACHE_TTL:
        print(f"⚡ FINANCE CACHE HIT: {key}")
        return FINANCE_CACHE[key]['data']
    return None

def set_cached_data(key: str, data):
    """Stores data in the in-memory cache with the current timestamp."""
    print(f"🌐 FINANCE API CALL: {key}")
    FINANCE_CACHE[key] = {'timestamp': time.time(), 'data': data}

# GET /finance/quotes — Live quotes for the user's tracked stocks
# Reads tracked_stocks from the user's profile (comma-separated string, e.g., "AAPL,MSFT,NVDA,COMI.CA")
# Uses yfinance.Tickers for a batch lookup instead of per-ticker calls
@router.get("/quotes")
def get_stock_quotes(current_user: models.User = Depends(get_current_user)):
    try:
        symbols = current_user.tracked_stocks or "AAPL,MSFT,NVDA,COMI.CA"
        cache_key = f"quotes_{symbols}"
        cached = get_cached_data(cache_key)
        if cached: return cached

        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        tickers = yf.Tickers(" ".join(symbol_list))  # Batch fetch
        market_data = []
        
        for sym in symbol_list:
            try:
                ticker = tickers.tickers.get(sym)
                if not ticker: continue
                hist = ticker.history(period="2d")  # Last 2 trading days
                if hist.empty: continue

                current_price = float(hist['Close'].iloc[-1])   # Most recent close
                
                if len(hist) >= 2:
                    prev_close = float(hist['Close'].iloc[-2])  # Previous day's close
                    change_amount = float(current_price - prev_close)
                    change_percent = float((change_amount / prev_close) * 100)
                else:
                    change_amount, change_percent = 0.0, 0.0

                # Detect Egyptian Pound vs USD based on the ticker's currency metadata
                currency = "E£" if ticker.info.get("currency") == "EGP" else "$"
                
                market_data.append({
                    "symbol": sym,
                    "short_name": str(ticker.info.get("shortName", sym)),
                    "current_price": round(current_price, 2),
                    "change_amount": round(change_amount, 2),
                    "change_percent": round(change_percent, 2),
                    "currency": currency,
                    "is_positive": bool(change_amount >= 0)   # For green/red coloring in UI
                })
            except Exception as e:
                print(f"Error processing {sym}: {e}")
                continue   # Skip failed symbols, don't crash the whole request
                
        result = {"quotes": market_data}
        set_cached_data(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /finance/stock/{symbol}?period=1y — Detailed stock view
# Returns candlestick OHLC data, news headlines, and company profile
# period options: "1d", "1w", "1m", "1y" (default), "5y"
@router.get("/stock/{symbol}")
def get_stock_details(symbol: str, period: str = "1y"):
    try:
        symbol = symbol.upper()
        cache_key = f"details_{symbol}_{period}"
        cached = get_cached_data(cache_key)
        if cached: return cached

        ticker = yf.Ticker(symbol)
        
        # Maps user-facing period strings to yfinance API parameters
        # Each UI period selects an appropriate data interval for chart clarity
        period_mapping = {
            "1d": {"p": "1d",  "i": "5m"},   # Intraday: 5-minute candles
            "1w": {"p": "5d",  "i": "1h"},   # 5 trading days: hourly candles
            "1m": {"p": "1mo", "i": "1d"},   # 1 month: daily candles
            "1y": {"p": "1y",  "i": "1d"},   # 1 year: daily candles
            "5y": {"p": "5y",  "i": "1wk"}   # 5 years: weekly candles
        }
        config = period_mapping.get(period, {"p": "1y", "i": "1d"})
        
        hist = ticker.history(period=config["p"], interval=config["i"])
        candlestick_data = []
        if not hist.empty:
            for date, row in hist.iterrows():
                candlestick_data.append({
                    "x": int(date.timestamp() * 1000),   # Unix timestamp in ms (for JS charting libraries)
                    "y": [                               # OHLC array format
                        round(float(row['Open']),  2),   # Open
                        round(float(row['High']),  2),   # High
                        round(float(row['Low']),   2),   # Low
                        round(float(row['Close']), 2)    # Close
                    ]
                })

        # Fetch news from Yahoo Finance RSS feed
        # Uses urllib + ET instead of requests to avoid adding another dependency
        formatted_news = []
        try:
            rss_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}&region=US&lang=en-US"
            req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                root = ET.fromstring(response.read())
                for item in root.findall('.//item')[:5]:  # Top 5 articles
                    try:
                        timestamp = int(parsedate_to_datetime(item.findtext('pubDate')).timestamp())
                    except:
                        timestamp = int(time.time())   # Fallback to current time if parse fails
                    formatted_news.append({
                        "title": item.findtext('title') or "Market Update",
                        "publisher": "Yahoo Finance",
                        "link": item.findtext('link') or "#",
                        "timestamp": timestamp
                    })
        except Exception as e:
            print(f"Failed to fetch RSS news for {symbol}: {e}")
            # News failure is non-fatal — return empty news list
        
        # Company profile from yfinance info dict (may be delayed/unavailable for some tickers)
        info = ticker.info
        profile = {
            "name": info.get("longName", symbol),
            "sector": info.get("sector", "Unknown Sector"),
            "summary": info.get("longBusinessSummary", "No summary available.")[:250] + "...",
            "market_cap": info.get("marketCap", 0)
        }

        result = {
            "symbol": symbol,
            "profile": profile,
            "candlestick_data": candlestick_data,
            "news": formatted_news,
            "current_period": period
        }
        set_cached_data(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### `docker-compose.yml`

**Purpose:** Defines and runs the PostgreSQL database as a Docker container.

**What It Does:**
- Spins up a PostgreSQL 15 Alpine instance named `dashboard_db`
- Maps container port 5432 to host port 5432
- Persists database data in a Docker named volume

**Code Walkthrough:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine        # Lightweight PostgreSQL 15 image
    container_name: dashboard_db     # Friendly name for docker ps / docker logs
    restart: always                  # Auto-restart on crash or system reboot
    environment:
      POSTGRES_USER: admin           # Must match the user in DATABASE_URL (.env)
      POSTGRES_PASSWORD: secretpassword  # Must match the password in DATABASE_URL
      POSTGRES_DB: dashboard         # Must match the DB name in DATABASE_URL
    ports:
      - "5432:5432"                  # host:container — exposes DB to the FastAPI app on localhost
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Named volume = data survives container restarts

volumes:
  postgres_data:                     # Docker manages this volume's lifecycle
```

---

## 4. API ENDPOINT REFERENCE

| Method | Path                              | Auth | Router   | Description                              |
|--------|-----------------------------------|------|----------|------------------------------------------|
| POST   | `/users/`                         | ❌   | users    | Register new user                        |
| POST   | `/token`                          | ❌   | users    | Login — returns JWT                      |
| GET    | `/users/me`                       | ✅   | users    | Get current user profile                 |
| POST   | `/logs/`                          | ✅   | diet     | Create a daily log                       |
| GET    | `/logs/`                          | ✅   | diet     | Get all daily logs                       |
| POST   | `/logs/{log_id}/meals/`           | ✅   | diet     | Add a meal to a log                      |
| GET    | `/logs/{log_id}/analyze`          | ✅   | diet     | AI nutrition analysis (Gemini)           |
| POST   | `/plans/generate?language=en|ar`  | ✅   | diet     | Generate AI 7-day meal plan              |
| GET    | `/plans/`                         | ✅   | diet     | Get all saved meal plans                 |
| GET    | `/football/hub`                   | ✅   | sports   | Get user's 3 teams data                  |
| GET    | `/football/team/{team_id}/overview` | ❌ | sports   | Get team name and logo                   |
| GET    | `/football/team/{team_id}/fixtures` | ❌ | sports   | Get next 5 upcoming fixtures             |
| GET    | `/football/team/{team_id}/squad`  | ❌   | sports   | Get team squad/roster                    |
| GET    | `/finance/quotes`                 | ✅   | finance  | Get live quotes for tracked stocks       |
| GET    | `/finance/stock/{symbol}?period=` | ❌   | finance  | Get candlestick data, news, and profile  |

---

## 5. AUTHENTICATION FLOW

```
1. Register:  POST /users/  → { email, password, ...profile }
              ← 200 UserResponse (no token yet)

2. Login:     POST /token   → form: username=email&password=pass
              ← { access_token: "<JWT>", token_type: "bearer" }

3. Use API:   GET /users/me
              Header: Authorization: Bearer <JWT>
              ← 200 UserResponse
              (or 401 if token is missing/invalid/expired)
```

**Token Lifetime:** 30 minutes (set by `ACCESS_TOKEN_EXPIRE_MINUTES` in `auth.py`)

**Algorithm:** HS256 (HMAC-SHA256) — symmetric signing using `SECRET_KEY`

---

## 6. CONFIGURATION & ENVIRONMENT

### Required Environment Variables

| Variable              | Example Value                                        | Used By           |
|-----------------------|------------------------------------------------------|-------------------|
| `DATABASE_URL`        | `postgresql://admin:secretpassword@localhost:5432/dashboard` | `database.py` |
| `SECRET_KEY`          | `my-super-secret-dashboard-key-2026`                 | `auth.py`, `security.py` |
| `GEMINI_API_KEY`      | `AIzaSy...`                                          | `routers/diet.py` |
| `API_FOOTBALL_KEY`    | `2ce0f8...`                                          | `routers/sports.py` |

### Optional Environment Variables (auth.py defaults)

| Variable                      | Default | Description                      |
|-------------------------------|---------|----------------------------------|
| `ALGORITHM`                   | `HS256` | JWT signing algorithm            |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30`    | JWT token lifetime in minutes    |

---

## 7. DEPLOYMENT GUIDE

### Development Setup

```bash
# 1. Start the PostgreSQL database
cd my-dashboard/
docker-compose up -d

# 2. Install Python dependencies
cd backend/
python -m venv venv
source venv/bin/activate     # Linux/Mac
# OR: venv\Scripts\activate  # Windows

pip install -r requirements.txt

# 3. Set up .env file (copy and fill in your values)
cp .env.example .env

# 4. Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Access Points

| Service        | URL                              |
|----------------|----------------------------------|
| API Base URL   | `http://localhost:8000`          |
| Swagger UI     | `http://localhost:8000/docs`     |
| ReDoc          | `http://localhost:8000/redoc`    |
| PostgreSQL     | `localhost:5432` (via Docker)    |

---

## 8. KNOWN ISSUES & NOTES

| Issue | Detail |
|-------|--------|
| **Duplicate security modules** | `auth.py` (uses `passlib` + `jose`) and `security.py` (uses `bcrypt` + `PyJWT`) both implement password hashing and JWT creation. Only `auth.py` is actively imported by routers. `security.py` should be removed or consolidated. |
| **In-memory caching** | Both `sports.py` and `finance.py` use plain Python dicts for caching. This cache is **not shared** between worker processes and **resets on restart**. For production, use Redis. |
| **Wide-open CORS** | `allow_origins=["*"]` in `main.py` should be restricted to specific frontend origins in production. |
| **No database migrations** | `create_all()` is used for table creation. For schema changes in production, add Alembic. |
| **Missing packages** | `yfinance` and `requests` are used in routers but not listed in `requirements.txt`. Add them. |
| **Plain-string stock preferences** | `tracked_stocks` on the User model is a comma-separated string in a single column. A `UserStocks` join table would be more normalized. |
