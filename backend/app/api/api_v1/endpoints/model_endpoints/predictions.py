from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from typing import Optional
from uuid import uuid4
import traceback
import io
from PIL import Image

from app.services.model_service import model_service
from app.services.report_service import generate_report
from app.services.auth_service import get_optional_current_user_id
from app.services.auth_service import get_current_user_mfa
from app.services.s3_service import S3Service
from app.services.pdf_service import generate_prediction_report_pdf
from ..dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter()
s3_service = S3Service()


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

        user_id = get_current_user_mfa(authorization)
        print("STEP 1: user_id =", user_id)

        image_bytes = await file.read()
        print("STEP 2: image read, bytes =", len(image_bytes))

        # --- NEW: Convert bytes to PIL Image ---
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file uploaded.")

        # --- NEW: Run the smart prediction (CLIP Filter + Ensemble) ---
        # Assuming model_service now exposes the `smart_predict` method
        result = model_service.smart_predict(image)
        
        # --- NEW: Check if the image is actually skin ---
        if not result.get("is_skin", True):
            print("STEP 2.5: Image rejected by skin filter.")
            # Return a 400 Bad Request to stop execution and alert the frontend
            raise HTTPException(
                status_code=400, 
                detail=result.get("message", "Please provide a clear, close-up image of the affected skin area.")
            )

        # Extract prediction and confidence from the dictionary
        label = result["prediction"]
        confidence = result["confidence"]
        print("STEP 3: prediction done =", label, confidence)

        response = {
            "prediction": label,
            "confidence": confidence,
            "recommendations": "This is a demo response. Please consult a dermatologist."
        }

        # Guest user -> only return prediction, no PDF/report storage
        if not user_id:
            print("STEP 4: guest user detected, skipping PDF generation and DB storage")
            return response

        report_text = generate_report(label, confidence)
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