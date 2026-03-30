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

        # Make auth optional so guests can still use prediction
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
        confidence = result["confidence"]
        print("STEP 3: prediction done =", label, confidence)

        response = {
            "prediction": label,
            "confidence": confidence,
            "recommendations": "This is a demo response. Please consult a dermatologist."
        }

        # Guest user -> only return prediction, no PDF/report storage
        if not user_id:
            print("STEP 4: guest or invalid token detected, skipping PDF generation and DB storage")
            return response

        report_text = generate_report(label, confidence)
        print("STEP 5: report text generated")

        report_id = str(uuid4())
        print("STEP 6: report_id =", report_id)

        image_ext = "jpg"
        if file.filename and "." in file.filename:
            image_ext = file.filename.rsplit(".", 1)[-1].lower()

        image_content_type = file.content_type or "image/jpeg"
        image_s3_key = f"reports/{user_id}/{report_id}/input_image.{image_ext}"
        s3_service.upload_image_bytes(image_bytes, image_s3_key, image_content_type)
        print("STEP 7: image uploaded to S3, key =", image_s3_key)

        pdf_bytes = generate_prediction_report_pdf(
            patient_id=str(user_id),
            report_id=report_id,
            prediction=label,
            confidence=confidence,
            report_text=report_text,
        )
        print("STEP 8: PDF generated, bytes =", len(pdf_bytes))

        report_s3_key = f"reports/{user_id}/{report_id}/report.pdf"
        s3_service.upload_pdf_bytes(pdf_bytes, report_s3_key)
        print("STEP 9: PDF uploaded to S3, key =", report_s3_key)

        conn = get_connection()
        cursor = conn.cursor()
        print("STEP 10: DB connection opened")

        cursor.execute(
            """
            INSERT INTO reports (
                id,
                user_id,
                prediction,
                confidence,
                report_s3_key,
                report_file_name,
                image_s3_key,
                image_file_name,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending')
            RETURNING id;
            """,
            (
                report_id,
                user_id,
                label,
                confidence,
                report_s3_key,
                "report.pdf",
                image_s3_key,
                f"input_image.{image_ext}",
            )
        )

        saved_report_id = cursor.fetchone()[0]
        conn.commit()
        print("STEP 11: DB insert committed, saved_report_id =", saved_report_id)

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