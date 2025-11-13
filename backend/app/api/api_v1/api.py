from fastapi import APIRouter

api_router = APIRouter()

# routees to add later - auth, image, dermatalogists etc

# Import and include other routers
from app.api.api_v1.endpoints.general_routes import (
    ping,
    users,
    predictions,
    classify,
)

api_router.include_router(ping.router, prefix="/ping", tags=["ping"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
api_router.include_router(classify.router, prefix="/classify", tags=["classification"])
