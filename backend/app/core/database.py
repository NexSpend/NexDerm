import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# --- Load Environment Variables ---
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT")

# --- Create Database Connection URL ---
SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# --- Create SQLAlchemy Engine ---
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# --- Create a SessionLocal class ---
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Create a Base class ---
Base = declarative_base()