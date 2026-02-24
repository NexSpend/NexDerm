from fastapi import APIRouter, File, UploadFile

from app.services.model_service import model_service


router = APIRouter()


@router.post("/", summary="Upload an image and get ensemble prediction")
async def classify_image(*, file: UploadFile = File(...)):
    image_bytes = await file.read()
    result = model_service.predict_from_image_bytes(image_bytes)

    return {
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "model_outputs": result["model_outputs"],
        "recommendations": "This is a demo response. Please consult a dermatologist.",
    }
