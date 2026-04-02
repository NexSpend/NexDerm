"""
backend/app/services/report_service.py
"""

from app.services.ai_service import get_ai_report


def generate_report(prediction: str, confidence: float) -> str:
    """Returns the raw AI report text to be rendered in the PDF."""
    return get_ai_report(prediction, float(confidence))