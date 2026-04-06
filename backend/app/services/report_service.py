# app/services/report_service.py
# This file serves as a simple helper for generating the text of the medical reports.
# It takes the model's skin prediction and confidence score, and passes them to 
# the AI service to fetch the detailed, patient-friendly explanation.

from app.services.ai_service import get_ai_report

def generate_report(prediction: str, confidence: float) -> str:
    # Returns the raw AI report text to be rendered in the PDF.
    return get_ai_report(prediction, float(confidence))