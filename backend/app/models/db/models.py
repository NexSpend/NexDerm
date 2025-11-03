import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

# Import the Base from database.py 
from .database import Base

class User(Base):
    """
    model for the 'users' table.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    #  "one-to-many" relationship
    classifications = relationship("Classification", back_populates="owner")


class Classification(Base):
    """
    model for the 'classifications' table.
    """
    __tablename__ = "classifications"

    id = Column(Integer, primary_key=True, index=True)

    image_reference = Column(String, index=True) 
    classification_result = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # foreign key to link to users table
    owner_id = Column(Integer, ForeignKey("users.id"))

    # "many-to-one" relationship
    owner = relationship("User", back_populates="classifications")