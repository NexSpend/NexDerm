from fastapi import APIRouter

api_router = APIRouter()

from app.api.api_v1.endpoints.general_routes import (
    ping, report_route, auth_routes
)

from app.api.api_v1.endpoints.model_endpoints import (
    predictions
)

api_router.include_router(ping.router, prefix="/ping", tags=["ping"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
api_router.include_router(report_route.router)
api_router.include_router(auth_routes.router)
