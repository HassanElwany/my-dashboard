from pydantic import BaseModel, ConfigDict
from datetime import datetime

# Schema for data coming IN from the frontend (Client -> API)
class UserCreate(BaseModel):
    email: str
    password: str

# Schema for data going OUT to the frontend (API -> Client)
class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    # This tells Pydantic to accept SQLAlchemy objects, not just Python dictionaries
    model_config = ConfigDict(from_attributes=True)