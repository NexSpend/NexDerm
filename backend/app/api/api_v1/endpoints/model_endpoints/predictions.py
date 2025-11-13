# app/api/api_v1/endpoints/predictions.py
from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import time

router = APIRouter()

@router.post("/", summary="Upload an image and get a dummy prediction")
async def create_prediction(file: UploadFile = File(...)):
    """Handles image upload from the Expo frontend and returns dummy prediction."""
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Save uploaded image
    contents = await file.read()
    filename = file.filename or f"upload_{int(time.time())}.jpg"
    save_path = uploads_dir / filename
    save_path.write_bytes(contents)

    print(f"[RECV] Saved file: {save_path} ({len(contents)} bytes)")

    # We have to later replace this with ML output, only dummy data right now
    return {
        "prediction": "benign_nevus",
        "confidence": 0.87,
        "recommendations": "This is a demo response. Please consult a dermatologist.",
        "filename": filename,
        "saved_to": str(save_path.resolve()),
        "size_bytes": len(contents)
    }
