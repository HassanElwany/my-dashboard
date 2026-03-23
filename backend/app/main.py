from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

app = FastAPI(
    title="Dashboard API",
    description="Backend for personal SaaS dashboard",
    version="0.1.0"
)

# Test route to verify database connectivity
@app.get("/db-test")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        # Execute a simple raw SQL query
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Database connected successfully!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running!"}