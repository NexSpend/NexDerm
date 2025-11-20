from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import time
from app.services.model_service import model_service


router = APIRouter()

@router.post("/", summary="Upload an image and get a dummy prediction")
async def classify_image(
    *,
    file: UploadFile = File(...)
):
    """
    Endpoint to:
    1. Receive an uploaded image.
    2. Get a prediction from the model service.
    3. Return the prediction as a JSON response.
    """
    image_bytes = await file.read()
    
    label, confidence = model_service.predict_from_image_bytes(image_bytes)
    
    return {"prediction": label, 
            "confidence": confidence, 
            "recommendations": "This is a demo response. Please consult a dermatologist."
            }
