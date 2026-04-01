from fastapi import APIRouter, UploadFile, File, Header, HTTPException
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

# ---------------------------------
# CONFIG
# ---------------------------------
LOW_CONFIDENCE_THRESHOLD = 0.65

# Put your real model labels here exactly as returned by the model.
# Since your labels come from checkpoint class_to_idx, update these
# once you verify the exact spelling/capitalization in your trained classes.
HIGH_RISK_DISEASES = {
    "melanoma",
    "monkeypox",
    "basal cell carcinoma",
    "cellulitis",
}

MEDIUM_RISK_DISEASES = {
    "eczema",
    "psoriasis",
    "rosacea",
    "acne",
}


# ---------------------------------
# HELPERS
# ---------------------------------
def normalize_label(label: str) -> str:
    return label.strip().lower()


def get_risk_level(predicted_label: str) -> str:
    normalized = normalize_label(predicted_label)

    if normalized in HIGH_RISK_DISEASES:
        return "high"
    if normalized in MEDIUM_RISK_DISEASES:
        return "medium"
    return "low"


def get_uncertainty_info(confidence: float) -> tuple[bool, Optional[str]]:
    is_uncertain = float(confidence) < LOW_CONFIDENCE_THRESHOLD

    if is_uncertain:
        return (
            True,
            "The model confidence is below the acceptable threshold, so this result may be uncertain. Please retake the image or consult a dermatologist."
        )

    return False, None


def get_recommendations(predicted_label: str, risk_level: str, is_uncertain: bool) -> str:
    if is_uncertain:
        return (
            "The result is uncertain. Please retake a clearer image in good lighting and consult a dermatologist if symptoms persist."
        )

    if risk_level == "high":
        return (
            f"The predicted condition '{predicted_label}' is considered high risk. "
            "Please seek medical attention or consult a dermatologist as soon as possible."
        )

    if risk_level == "medium":
        return (
            f"The predicted condition '{predicted_label}' is considered medium risk. "
            "Monitoring symptoms and consulting a dermatologist is recommended."
        )

    return (
        f"The predicted condition '{predicted_label}' is considered lower risk. "
        "Continue monitoring the area and consult a dermatologist if it worsens."
    )


@router.post("/", summary="Upload an image, get prediction, and optionally generate/store a report for logged-in users")
async def classify_image(
    *,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    conn = None
    cursor = None

    try:
        print("STEP 0: start endpoint")

        # Optional auth so guest users can still run predictions
        user_id = None
        try:
            if authorization and authorization.strip():
                user_id = get_optional_current_user_id(authorization)
        except Exception as auth_error:
            print("OPTIONAL AUTH ERROR:", str(auth_error))
            user_id = None

        print("STEP 1: user_id =", user_id)

        image_bytes = await file.read()
        print("STEP 2: image read, bytes =", len(image_bytes))

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file uploaded.")

        result = model_service.smart_predict(image)

        if not result.get("is_skin", True):
            print("STEP 2.5: Image rejected by skin filter.")
            raise HTTPException(
                status_code=400,
                detail=result.get(
                    "message",
                    "Please provide a clear, close-up image of the affected skin area."
                )
            )

        label = result["prediction"]
        confidence = float(result["confidence"])
        print("STEP 3: prediction done =", label, confidence)

        risk_level = get_risk_level(label)
        is_uncertain, uncertainty_message = get_uncertainty_info(confidence)
        recommendations = get_recommendations(label, risk_level, is_uncertain)

        response = {
            "prediction": label,
            "confidence": confidence,
            "risk_level": risk_level,
            "is_uncertain": is_uncertain,
            "uncertainty_message": uncertainty_message,
            "recommendations": recommendations,
        }

        # Guest user -> return prediction only, skip report storage
        if not user_id:
            print("STEP 4: guest or invalid token detected, skipping PDF generation and DB storage")
            return response

        report_text = generate_report(
            prediction=label,
            confidence=confidence,
            risk_level=risk_level,
            is_uncertain=is_uncertain,
            uncertainty_message=uncertainty_message,
            recommendations=recommendations,
        )
        print("STEP 5: report text generated")

        report_id = str(uuid4())
        print("STEP 6: report_id =", report_id)

        pdf_bytes = generate_prediction_report_pdf(
            patient_id=str(user_id),
            report_id=report_id,
            prediction=label,
            confidence=confidence,
            report_text=report_text,
        )
        print("STEP 7: PDF generated, bytes =", len(pdf_bytes))

        s3_key = f"reports/{user_id}/{report_id}/report.pdf"
        s3_service.upload_pdf_bytes(pdf_bytes, s3_key)
        print("STEP 8: PDF uploaded to S3, key =", s3_key)

        conn = get_connection()
        cursor = conn.cursor()
        print("STEP 9: DB connection opened")

        cursor.execute(
            """
            INSERT INTO reports (id, user_id, prediction, confidence, report_s3_key, report_file_name)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (report_id, user_id, label, confidence, s3_key, "report.pdf")
        )

        saved_report_id = cursor.fetchone()[0]
        conn.commit()
        print("STEP 10: DB insert committed, saved_report_id =", saved_report_id)

        response["report_id"] = str(saved_report_id)
        return response

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR IN /predictions:")
        print(str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction/report generation failed: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()