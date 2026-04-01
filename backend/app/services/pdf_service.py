"""
backend/app/services/pdf_service.py

Renders the AI report text into a clean PDF.
The AI returns plain text with section headers — we split and render each section.
"""

import os
from io import BytesIO
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors

# Brand colours from frontend/src/utils/commonStyles.ts
PRIMARY      = colors.HexColor("#004aad")
BG           = colors.HexColor("#f7f9fc")
TEXT_PRIMARY = colors.HexColor("#1f2937")
TEXT_SEC     = colors.HexColor("#4b5563")
TEXT_TERT    = colors.HexColor("#6b7280")
WHITE        = colors.white
BORDER       = colors.HexColor("#cbd5e1")
MID_GRAY     = colors.HexColor("#e5e7eb")

SEVERITY_COLORS = {
    "high":   colors.HexColor("#16a34a"),
    "medium": colors.HexColor("#d97706"),
    "low":    colors.HexColor("#dc2626"),
}

LOGO_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "frontend", "assets", "logo-nobg.png"
)

W, H = letter
L, R = 48, W - 48
COL  = R - L

SECTION_TITLES = ["SUMMARY", "CAUSES", "SYMPTOMS", "WHAT TO OBSERVE", "WHAT TO DO", "WHEN TO SEEK CARE"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _text(c, x, y, txt, font="Helvetica", size=10, color=TEXT_PRIMARY, align="left"):
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "right":
        c.drawRightString(x, y, txt)
    elif align == "center":
        c.drawCentredString(x, y, txt)
    else:
        c.drawString(x, y, txt)


def _wrap_text(c, x, y, text, font, size, color, max_w, line_h=14) -> float:
    """Word-wrap text, return y after last line."""
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    line  = ""
    for word in words:
        test = (line + " " + word).strip()
        if c.stringWidth(test, font, size) > max_w:
            if line:
                c.drawString(x, y, line)
                y -= line_h
            line = word
        else:
            line = test
    if line:
        c.drawString(x, y, line)
        y -= line_h
    return y


def _divider(c, y, color=BORDER):
    c.setStrokeColor(color)
    c.setLineWidth(0.5)
    c.line(L, y, R, y)


def _rect(c, x, y, w, h, fill, stroke=None, radius=4):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1 if stroke else 0)


def _confidence_bar(c, x, y, w, h, pct, tier):
    _rect(c, x, y, w, h, MID_GRAY, radius=3)
    fill = SEVERITY_COLORS.get(tier, PRIMARY)
    _rect(c, x, y, max(4, w * pct / 100), h, fill, radius=3)


def _parse_sections(text: str) -> list:
    """
    Split the AI plain text into [(title, body), ...] pairs.
    """
    sections = []
    current_title = None
    current_lines = []

    for line in text.splitlines():
        stripped = line.strip()
        # Strip markdown bold/italic markers the model sometimes adds (e.g. **SUMMARY**)
        clean = stripped.strip("*").strip("#").strip()
        if clean.upper() in SECTION_TITLES:
            if current_title is not None:
                sections.append((current_title, "\n".join(current_lines).strip()))
            current_title = clean.upper()
            current_lines = []
        elif current_title is not None:
            current_lines.append(stripped)

    if current_title is not None:
        sections.append((current_title, "\n".join(current_lines).strip()))

    return sections


# ── Header ────────────────────────────────────────────────────────────────────

def _draw_header(c, report_id_short, date_str):
    HDR_H = 72
    _rect(c, 0, H - HDR_H, W, HDR_H, PRIMARY, radius=0)

    logo_drawn = False
    if os.path.exists(LOGO_PATH):
        try:
            # Centre the 40-pt logo vertically in the header (header centre = H - HDR_H/2)
            logo_y = H - HDR_H / 2 - 27          # bottom of 40-pt image → centre at H-36
            c.drawImage(LOGO_PATH, L-15, logo_y, width=70, height=70,
                        mask="auto", preserveAspectRatio=True)
            logo_drawn = True
        except Exception:
            pass

    tx = L + (52 if logo_drawn else 0)
    # Place both text baselines symmetrically around the header centre (H - 36)
    _text(c, tx, H - 28, "NexDerm", "Helvetica-Bold", 22, WHITE)
    _text(c, tx, H - 44, "AI Skin Analysis Report", "Helvetica", 11, colors.HexColor("#a8c8f0"))
    _text(c, R, H - 28, f"Report  {report_id_short}", "Helvetica", 9, WHITE, "right")
    _text(c, R, H - 42, date_str, "Helvetica", 9, colors.HexColor("#a8c8f0"), "right")

    return H - HDR_H - 18


# ── Patient info ──────────────────────────────────────────────────────────────

def _draw_info(c, y, patient_id, report_id_short, date_str):
    _text(c, L, y, "PATIENT INFORMATION", "Helvetica-Bold", 8, PRIMARY)
    _divider(c, y - 4)
    y -= 18

    pairs = [
        ("PATIENT ID",    patient_id),
        ("REPORT ID",     report_id_short),
        ("DATE",          date_str),
        ("ANALYSIS TYPE", "AI Dermatology Screening"),
    ]
    col_w = COL / 2
    for i, (lbl, val) in enumerate(pairs):
        cx   = L + col_w * (i % 2)
        row_y = y - (i // 2) * 28
        _text(c, cx, row_y,      lbl, "Helvetica",      8, TEXT_TERT)
        _text(c, cx, row_y - 12, val, "Helvetica-Bold", 9, TEXT_PRIMARY)

    return y - 58


# ── Result card ───────────────────────────────────────────────────────────────

def _draw_result_card(c, y, prediction, confidence):
    pct  = round(confidence * 100, 1)
    tier = "high" if confidence >= 0.80 else "medium" if confidence >= 0.50 else "low"
    tier_label = {"high": "High Confidence", "medium": "Moderate Confidence", "low": "Low Confidence"}[tier]

    _text(c, L, y, "DETECTION RESULT", "Helvetica-Bold", 8, PRIMARY)
    _divider(c, y - 4)
    y -= 12

    CARD_H = 76
    _rect(c, L, y - CARD_H, COL, CARD_H, BG, stroke=BORDER)

    # Condition name
    _text(c, L + 14, y - 18, prediction, "Helvetica-Bold", 16, PRIMARY)

    # Confidence bar
    _text(c, L + 14, y - 34, "CONFIDENCE SCORE", "Helvetica", 8, TEXT_TERT)
    _text(c, L + 14, y - 46, f"{pct}%", "Helvetica-Bold", 11, TEXT_PRIMARY)
    _confidence_bar(c, L + 14, y - 60, COL * 0.55, 8, pct, tier)

    # Tier badge
    badge_col = SEVERITY_COLORS.get(tier, PRIMARY)
    bx = L + COL * 0.70
    _rect(c, bx, y - 62, COL * 0.26, 46, colors.HexColor("#f0f9ff"), stroke=colors.HexColor("#bae6fd"), radius=6)
    _text(c, bx + (COL * 0.26) / 2, y - 28, "CONFIDENCE", "Helvetica", 7, TEXT_TERT, "center")
    _text(c, bx + (COL * 0.26) / 2, y - 44, tier_label, "Helvetica-Bold", 8, badge_col, "center")

    return y - CARD_H - 14


# ── Section renderer ──────────────────────────────────────────────────────────

def _draw_section(c, y, title, body) -> float:
    """Render one section heading + its body text. Returns new y."""
    _text(c, L, y, title, "Helvetica-Bold", 8, PRIMARY)
    _divider(c, y - 4)
    y -= 16

    for line in body.splitlines():
        line = line.strip()
        if not line:
            y -= 4
            continue

        if line.startswith("-"):
            # Bullet point
            _text(c, L + 4,  y, "-", "Helvetica", 10, PRIMARY)
            y = _wrap_text(c, L + 14, y, line[1:].strip(), "Helvetica", 10, TEXT_SEC, COL - 18, line_h=13)
        else:
            # Paragraph
            y = _wrap_text(c, L, y, line, "Helvetica", 10, TEXT_SEC, COL, line_h=14)

        y -= 2

    return y - 6


# ── Disclaimer ────────────────────────────────────────────────────────────────

def _draw_disclaimer(c, y):
    _divider(c, y)
    _wrap_text(
        c, L, y - 12,
        "WARNING: This report was generated by an AI skin analysis system. "
        "Results are for informational purposes only and do not constitute a medical diagnosis. "
        "Always consult a qualified dermatologist or healthcare professional.",
        "Helvetica-Oblique", 8, TEXT_TERT, COL, line_h=11,
    )


# ── Public API ────────────────────────────────────────────────────────────────

def generate_prediction_report_pdf(
    patient_id: str,
    report_id: str,
    prediction: str,
    confidence: float,
    report_text: str,       # plain text from ai_service / report_service
) -> bytes:

    rid      = report_id[-8:].upper()
    date_str = datetime.now().strftime("%B %d, %Y  %H:%M")

    buf = BytesIO()
    cv  = canvas.Canvas(buf, pagesize=letter)
    cv.setTitle("NexDerm AI Skin Analysis Report")

    y = _draw_header(cv, rid, date_str)
    y = _draw_info(cv, y, patient_id, rid, date_str)
    y -= 6
    y = _draw_result_card(cv, y, prediction, confidence)

    # Parse and render each section from the AI text
    sections = _parse_sections(report_text)
    for title, body in sections:
        if body:
            y = _draw_section(cv, y, title, body)

    _draw_disclaimer(cv, y - 6)

    cv.save()
    buf.seek(0)
    return buf.read()