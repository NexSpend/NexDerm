from fastapi import APIRouter

from app.api.api_v1.endpoints.general_routes import report_route
from app.api.api_v1.endpoints import doctor_routes # Import the new doctor_routes

api_router = APIRouter()

from app.api.api_v1.endpoints.general_routes import (
    ping, report_route, user_history, users, auth_routes
)

from app.api.api_v1.endpoints.model_endpoints import (
    predictions
)

api_router.include_router(ping.router, prefix="/ping", tags=["Ping"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
api_router.include_router(report_route.router)
api_router.include_router(user_history.router)
api_router.include_router(users.router)
api_router.include_router(doctor_routes.router, prefix="/doctors", tags=["Doctors"])
api_router.include_router(auth_routes.router)
