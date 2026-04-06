# app/api/api_v1/endpoints/dataBase_endpoints/dataBase_connection.py
# This file establishes a secure connection to the PostgreSQL database.
# It reads login credentials from environment variables and provides a
# helper function to connect the application to the database securely.
import os
import psycopg2
from dotenv import load_dotenv

# pull environment variables from the local .env file
load_dotenv()

DB_HOST = os.environ.get("DB_HOST")
DB_NAME = os.environ.get("DB_NAME")
DB_USER = os.environ.get("DB_USER")
DB_PASSWORD = os.environ.get("DB_PASSWORD")
DB_PORT = os.environ.get("DB_PORT")


# establish a secure connection to the postgres database
def get_connection():
    # crash early if any required connection secrets are missing
    if not all([DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT]):
        raise ValueError("Database configuration is missing in .env")

    # connect to the db requiring ssl encryption
    conn = psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT,
        sslmode="require"
    )
    return conn