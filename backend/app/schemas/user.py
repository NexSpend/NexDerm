from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class UserResponse(UserBase):
    id: int
    role: str
    profile_image_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
