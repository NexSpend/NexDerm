from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import get_db, get_current_user
from app.services.model_service import model_service

router = APIRouter()

@router.post("/image", response_model=schemas.Classification)
async def classify_image(
    *,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    file: UploadFile = File(...)
):
    """
    Endpoint to:
    1. Receive an uploaded image.
    2. Get a prediction from the model service.
    3. Save the result to the database.
    """
    image_bytes = await file.read()
    
    # 1. Get prediction from the model service
    label, confidence = model_service.predict_from_image_bytes(image_bytes)
    
    # 2. Create the classification object to be saved and returned
    classification_in = schemas.ClassificationCreate(result=label, confidence=confidence, image_ref=file.filename)
    db_classification = crud.create_user_classification(db=db, obj_in=classification_in, user_id=current_user.id)

    return db_classification