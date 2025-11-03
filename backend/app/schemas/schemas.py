import datetime
from pydantic import BaseModel

# --- Classification Schemas ---

class ClassificationBase(BaseModel):
    """Shared base attributes for a Classification."""
    image_reference: str
    classification_result: str

class ClassificationCreate(ClassificationBase):
    """Attributes required to create a new Classification (used in POST)."""
    # All fields are inherited from Base
    pass

class Classification(ClassificationBase):
    """Attributes to return when reading a Classification (used in GET)."""
    id: int
    owner_id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- User Schemas ---

class UserBase(BaseModel):
    """Shared base attributes for a User."""
    email: str

class UserCreate(UserBase):
    """Attributes required to create a new User (used in POST)."""
    password: str

class User(UserBase):
    """Attributes to return when reading a User (used in GET)."""
    id: int
    
    # We also want to return the list of classifications
    # associated with this user.
    classifications: list[Classification] = []

    class Config:
        from_attributes = True