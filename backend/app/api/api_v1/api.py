from fastapi import APIRouter

from app.api.api_v1.endpoints.general_routes import report_route
from app.api.api_v1.endpoints import doctor_routes # Import the new doctor_routes

api_router = APIRouter()

# routees to add later - auth, image, dermatalogists etc

# Import and include other routers
from app.api.api_v1.endpoints.general_routes import (
    ping, report_route, user_history, users
)

from app.api.api_v1.endpoints.model_endpoints import (
    predictions
)

api_router.include_router(ping.router, prefix="/ping", tags=["ping"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
api_router.include_router(report_route.router)
api_router.include_router(user_history.router)
api_router.include_router(users.router)
api_router.include_router(doctor_routes.router, prefix="/doctors", tags=["doctors"]) # Include the new doctor_routes
