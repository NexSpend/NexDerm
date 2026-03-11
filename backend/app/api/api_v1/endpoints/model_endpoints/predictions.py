from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from typing import Optional
from uuid import uuid4
import traceback

from app.services.model_service import model_service
from app.services.report_service import generate_report
from app.services.auth_service import get_current_user
from app.services.s3_service import S3Service
from app.services.pdf_service import generate_prediction_report_pdf
from ..dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter()
s3_service = S3Service()


@router.post("/", summary="Upload an image, get prediction, generate PDF, and store report")
async def classify_image(
    *,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    conn = None
    cursor = None

    try:
        print("STEP 0: start endpoint")

        user_id = get_current_user(authorization)
        print("STEP 1: user_id =", user_id)

        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        image_bytes = await file.read()
        print("STEP 2: image read, bytes =", len(image_bytes))

        label, confidence = model_service.predict_from_image_bytes(image_bytes)
        print("STEP 3: prediction done =", label, confidence)

        report_text = generate_report(label, confidence)
        print("STEP 4: report text generated")

        report_id = str(uuid4())
        print("STEP 5: report_id =", report_id)

        pdf_bytes = generate_prediction_report_pdf(
            patient_id=str(user_id),
            report_id=report_id,
            prediction=label,
            confidence=confidence,
            report_text=report_text,
        )
        print("STEP 6: PDF generated, bytes =", len(pdf_bytes))

        s3_key = f"reports/{user_id}/{report_id}/report.pdf"
        s3_service.upload_pdf_bytes(pdf_bytes, s3_key)
        print("STEP 7: PDF uploaded to S3, key =", s3_key)

        conn = get_connection()
        cursor = conn.cursor()
        print("STEP 8: DB connection opened")

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
        print("STEP 9: DB insert committed, saved_report_id =", saved_report_id)

        return {
            "prediction": label,
            "confidence": confidence,
            "report_id": str(saved_report_id),
            "recommendations": "This is a demo response. Please consult a dermatologist."
        }

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
