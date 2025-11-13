from fastapi import APIRouter, UploadFile, File
from app.services.model_service import model_service

router = APIRouter()

@router.post("/image")
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
    
    # 1. Get prediction from the model service
    label, confidence = model_service.predict_from_image_bytes(image_bytes)
    
    # 2. Return the result directly as a dictionary
    return {"label": label, "confidence": confidence}