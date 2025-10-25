from fastapi import APIRouter

api_router = APIRouter()

# routees to add later - auth, image, dermatalogists etc

# Import and include other routers
from app.api.api_v1.endpoints import (
    ping,
    users,
    predictions
)

api_router.include_router(ping.router, prefix="/ping", tags=["ping"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])