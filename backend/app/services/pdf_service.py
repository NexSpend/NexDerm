from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime


def generate_prediction_report_pdf(
    patient_id: str,
    report_id: str,
    prediction: str,
    confidence: float,
    report_text: str,
) -> bytes:

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    width, height = letter
    y = height - 50

    # Title
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(50, y, "NexDerm AI Skin Analysis Report")

    y -= 40

    # Patient Info Section
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "Patient Information")

    y -= 20
    pdf.setFont("Helvetica", 11)

    pdf.drawString(50, y, f"Patient ID: {patient_id}")
    y -= 15

    pdf.drawString(50, y, f"Report ID: {report_id}")
    y -= 15

    pdf.drawString(50, y, f"Date Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    y -= 30

    # Prediction Section
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "Prediction Result")

    y -= 20
    pdf.setFont("Helvetica", 11)

    pdf.drawString(50, y, f"Detected Condition: {prediction}")
    y -= 15

    pdf.drawString(50, y, f"Model Confidence: {confidence:.2f}%")

    y -= 30

    # Clinical Summary
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "Clinical Summary")

    y -= 20
    pdf.setFont("Helvetica", 11)

    for line in report_text.split("\n"):
        if y < 70:
            pdf.showPage()
            pdf.setFont("Helvetica", 11)
            y = height - 50

        pdf.drawString(50, y, line[:95])
        y -= 15

    y -= 20

    # Disclaimer
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "Disclaimer")

    y -= 15
    pdf.setFont("Helvetica", 10)

    disclaimer = (
        "This report was generated using an AI-based skin analysis system. "
        "The results are intended for informational purposes only and should "
        "not be considered a medical diagnosis. Please consult a qualified "
        "dermatologist or healthcare professional for proper medical advice."
    )

    for line in disclaimer.split(". "):
        if y < 70:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = height - 50

        pdf.drawString(50, y, line)
        y -= 14

    pdf.save()

    buffer.seek(0)
    return buffer.read()