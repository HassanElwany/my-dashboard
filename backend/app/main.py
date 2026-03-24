from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError

from app.database import engine, get_db
from app import models, schemas, security # <-- IMPORT security

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dashboard API",
    description="Backend for personal SaaS dashboard",
    version="0.1.0"
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


@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # --- UPDATED: Use the real bcrypt hashing function ---
    hashed_pwd = security.get_password_hash(user.password)
    
    new_user = models.User(email=user.email, hashed_password=hashed_pwd)
    
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