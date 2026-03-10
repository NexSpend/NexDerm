from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, UserBase

router = APIRouter()

@router.post("/", response_model=UserResponse)
def create_user(user_data: UserBase, db: Session = Depends(get_db)):
    """Create new user after sign up"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create new user with managed password
    db_user = User(
        email=user_data.email,
        hashed_password="managed_by_supabase_auth",
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role="patient"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/by-email/{email}", response_model=UserResponse)
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    """Get user profile by email"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/{user_id}", response_model=UserResponse)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    """Get user profile by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user_profile(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update user profile"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.first_name is not None:
        user.first_name = user_update.first_name
    if user_update.last_name is not None:
        user.last_name = user_update.last_name
    if user_update.phone is not None:
        user.phone = user_update.phone
    if user_update.profile_image_url is not None:
        user.profile_image_url = user_update.profile_image_url
    
    db.commit()
    db.refresh(user)
    return user