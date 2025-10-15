from fastapi import APIRouter

api_router = APIRouter()

# Import and include other routers
from app.api.api_v1.endpoints import (
    auth,
    users,
    images,
    predictions,
    dermatologists
)

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
api_router.include_router(dermatologists.router, prefix="/dermatologists", tags=["dermatologists"])