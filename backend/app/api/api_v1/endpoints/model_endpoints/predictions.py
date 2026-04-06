# app/api/api_v1/endpoints/model_endpoints/predictions.py
# This file handles the core AI image analysis for the application.
# It receives uploaded skin images, predicts possible conditions using the machine learning model,
# and triggers background tasks to securely generate and save detailed PDF reports.

from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Header, HTTPException
from typing import Optional
from uuid import uuid4
import traceback
import io
from PIL import Image

from app.services.model_service import model_service
from app.services.report_service import generate_report
from app.services.auth_service import get_optional_current_user_id
from app.services.s3_service import S3Service
from app.services.pdf_service import generate_prediction_report_pdf
from ..dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter()
s3_service = S3Service()


HIGH_RISK_DISEASES = {
    "Actinic keratoses",
    "Basal cell carcinoma",
    "Chickenpox",
    "Cowpox",
    "HFMD",
    "Measles",
    "Melanoma",
    "Monkeypox",
    "Squamous cell carcinoma",
}

LOW_RISK_DISEASES = {
    "Benign keratosis-like-lesions",
    "Dermatofibroma",
    "Melanocytic nevi",
    "Vascular lesions",
}

NO_RISK_DISEASES = {
    "Healthy",
}


# cleans up the label string to prevent matching errors
def _normalize_label(label: str) -> str:
    # fallback to empty string if label is missing
    return (label or "").strip()


# maps a disease label to its corresponding risk category
def _get_risk_level(label: str) -> str:
    normalized_label = _normalize_label(label)

    # return exact risk match if found in our sets
    if normalized_label in NO_RISK_DISEASES:
        return "No Risk"
    if normalized_label in HIGH_RISK_DISEASES:
        return "High Risk"
    if normalized_label in LOW_RISK_DISEASES:
        return "Low Risk"

    # default to low risk for unmapped diseases
    return "Low Risk"


# formats the raw confidence score into a standard percentage
def _to_confidence_percentage(confidence: float) -> float:
    if confidence is None:
        return 0.0

    # catch malformed data before math operations
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        return 0.0

    # scale up decimals to full percentages
    if 0.0 <= confidence <= 1.0:
        return confidence * 100.0
    return confidence


# generates a warning text if the model is not confident enough
def _get_low_confidence_warning(confidence: float) -> Optional[str]:
    confidence_percentage = _to_confidence_percentage(confidence)

    # flag predictions that fall below the 60 percent threshold
    if confidence_percentage < 60.0:
        return "Confidence is low, so the result may be uncertain."
    return None


# constructs the final dictionary sent back to the client
def _build_response_payload(label: str, confidence: float, report_id: Optional[str] = None) -> dict:
    confidence_percentage = _to_confidence_percentage(confidence)
    risk_level = _get_risk_level(label)
    low_confidence_warning = _get_low_confidence_warning(confidence)

    response = {
        "prediction": label,
        "confidence": confidence,
        "confidence_percentage": round(confidence_percentage, 2),
        "risk_level": risk_level,
        "low_confidence_warning": low_confidence_warning,
    }

    # attach the report ID only if one was generated
    if report_id is not None:
        response["report_id"] = report_id

    return response


# handles async report generation and uploads files to s3 and the database
def _build_and_store_report(
    user_id: str,
    report_id: str,
    label: str,
    confidence: float,
    image_bytes: bytes,
    image_filename: str,
    image_content_type: str,
):
    conn = cursor = None
    try:
        print(f"[bg] generating report for {report_id}")

        # fetch plain text medical analysis from ai model
        report_text = generate_report(label, confidence)

        image_ext = "jpg"
        # extract file extension safely if present
        if image_filename and "." in image_filename:
            image_ext = image_filename.rsplit(".", 1)[-1].lower()

        image_content_type = image_content_type or "image/jpeg"
        image_s3_key = f"reports/{user_id}/{report_id}/input_image.{image_ext}"
        
        # push raw image data up to the s3 bucket
        s3_service.upload_image_bytes(image_bytes, image_s3_key, image_content_type)
        print("STEP 7: image uploaded to S3, key =", image_s3_key)

        # compile all report components into a final pdf byte stream
        pdf_bytes = generate_prediction_report_pdf(
            patient_id=user_id,
            report_id=report_id,
            prediction=label,
            confidence=confidence,
            report_text=report_text,
        )

        report_s3_key = f"reports/{user_id}/{report_id}/report.pdf"
        # upload the generated pdf alongside the original image
        s3_service.upload_pdf_bytes(pdf_bytes, report_s3_key)
        print(f"[bg] uploaded → {report_s3_key}")

        # connect to db to link s3 keys to the current report record
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE reports SET report_s3_key = %s, report_file_name = %s, image_s3_key = %s, image_file_name = %s WHERE id = %s;",
            (report_s3_key, "report.pdf", image_s3_key, f"input_image.{image_ext}", report_id),
        )
        conn.commit()
        print(f"[bg] DB updated for {report_id}")

    except Exception as e:
        print(f"[bg] ERROR: {e}")
        traceback.print_exc()
    finally:
        # ensure db resources are released even if an error occurs
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# processes uploaded images to run inference and conditionally kicks off report generation
@router.post("/",
             summary="Analyze Skin Image",
             description="""
            Receives the image uploaded or captured by user and then run AI model inference to classify the disease.
            
            - Guest Users: Returns Prediction immediately. No data is saved.
            - Logged-in Users: Returns the prediction immediately and triggers a background task to generate AI medical report. Then creates a pdf and saves it to the user's history securely via AWS S3.
             """)
async def classify_image(
    *,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    try:
        user_id = None
        try:
            # attempt to extract user identity from the auth header
            if authorization and authorization.strip():
                user_id = get_optional_current_user_id(authorization)
        except Exception:
            user_id = None

        print("STEP 1: user_id =", user_id)

        # load image data directly into memory
        image_bytes = await file.read()
        print("STEP 2: image read, bytes =", len(image_bytes))
        
        try:
            # convert uploaded bytes into an rgb image object
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        # hand off to the model service for actual disease prediction
        result = model_service.smart_predict(image)
        
        # reject non-skin images based on model feedback
        if not result.get("is_skin", True):
            raise HTTPException(status_code=400, detail=result.get("message", "Please upload a skin image."))

        label = result["prediction"]
        confidence = result["confidence"]
        print(f"STEP 3: prediction done = {label} {confidence}")

        # bail out early for guests since they do not get saved reports
        if not user_id:
            return _build_response_payload(label=label, confidence=confidence)

        # reserve a unique identifier for the upcoming report
        report_id = str(uuid4())
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # drop a pending placeholder row into the db so the user sees it immediately
            cursor.execute(
                "INSERT INTO reports (id, user_id, prediction, confidence, report_s3_key, report_file_name) VALUES (%s, %s, %s, %s, %s, %s);",
                (report_id, user_id, label, confidence, "", "pending"),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        # offload the heavy pdf and s3 tasks to a background worker
        background_tasks.add_task(
            _build_and_store_report,
            user_id=str(user_id),
            report_id=report_id,
            label=label,
            confidence=confidence,
            image_bytes=image_bytes,
            image_filename=file.filename or "",
            image_content_type=file.content_type or "image/jpeg",
        )
        print(f"STEP 4: response sent, background task scheduled for {report_id}")

        return _build_response_payload(label=label, confidence=confidence, report_id=report_id)

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))