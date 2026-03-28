from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine

# Import the new routers
from .routers import users, diet, sports, finance

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lumina API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect all the modules to the main app
app.include_router(users.router)
app.include_router(diet.router)
app.include_router(sports.router)
app.include_router(finance.router)