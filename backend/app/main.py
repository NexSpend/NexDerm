from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title="NextDerm BackEnd",
    description="Backend API for NexDerm Mobile Application. This handles User Authentication, Skin Analysis, Patient History Tracking, S3- Backend PDF report generation and Doctor Case Review system for final diagnoses.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.api.api_v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/",
         tags=["System"],
         summary="API Health Check / Root",
         description="A simple health check endpoint to verify that the NexDerm backend is up and running. Returns a welcome message."
)
async def root():
    return {"message": "Welcome to NexDerm API"}