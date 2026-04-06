# app/services/ai_service.py
# This file uses an external AI service to generate easy-to-understand medical explanations.
# It takes the model's skin prediction and writes a patient-friendly report detailing 
# symptoms, causes, and the recommended next steps.

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"
MODEL              = "stepfun/step-3.5-flash:free"

PROMPT = """\
An AI skin analysis app detected {condition} in a patient's skin image with {pct}% confidence.

Write a patient-friendly dermatology report with these sections. Use the exact section titles:

SUMMARY
Write 3-4 sentences explaining what {condition} is, what causes it, and what the patient can expect. Mention this is an AI screening result and a dermatologist must confirm it.

CAUSES
List 3 common causes of {condition}, one per line starting with -.

SYMPTOMS
List 3 common symptoms of {condition} a patient would notice, one per line starting with -.

WHAT TO OBSERVE
List 3 specific skin changes the patient should watch for day to day, one per line starting with -.

WHAT TO DO
List 4 concrete actions the patient should take now, one per line starting with -.

WHEN TO SEEK CARE
One sentence describing warning signs that require urgent medical attention.
"""


# fetch an ai generated patient report using openrouter
def get_ai_report(condition: str, confidence: float) -> str:
    # scale confidence float to a readable percentage
    pct = round(confidence * 100, 1)

    # bail out early and use fallback if api key is missing
    if not OPENROUTER_API_KEY:
        print("[ai_service] No API key — using fallback")
        return _fallback(condition, pct)

    try:
        # hit the openrouter api with the templated prompt
        resp = httpx.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type":  "application/json",
                "HTTP-Referer":  "https://nexderm.app",
                "X-Title":       "NexDerm",
            },
            json={
                "model":       MODEL,
                "messages":    [{"role": "user", "content": PROMPT.format(condition=condition, pct=pct)}],
                "temperature": 0.3,
            },
            timeout=15.0,
        )
        # blow up immediately if we get a non-200 response
        resp.raise_for_status()
        
        # drill into the json payload to extract the actual markdown text
        text = resp.json()["choices"][0]["message"]["content"].strip()
        print(f"[ai_service] OK — {len(text)} chars")
        return text

    # catch network timeouts or parsing errors to trigger the static text
    except Exception as exc:
        print(f"[ai_service] FAILED ({type(exc).__name__}): {exc}")
        return _fallback(condition, pct)


# generate a generic static report when the ai call fails
def _fallback(condition: str, pct: float) -> str:
    return f"""SUMMARY
{condition} was detected with {pct}% confidence. This is an AI screening result only and must be confirmed by a qualified dermatologist. Do not self-diagnose or self-medicate based on this result alone.

CAUSES
- Various underlying skin conditions or infections
- Environmental or allergic triggers
- Genetic or immune system factors

SYMPTOMS
- Changes in skin colour, texture, or appearance
- Itching, burning, or tenderness in the affected area
- Blisters, scaling, crusting, or redness

WHAT TO OBSERVE
- Whether the affected area is growing larger or spreading
- Any changes in colour, thickness, or texture
- New symptoms such as pain, discharge, or bleeding

WHAT TO DO
- Photograph the area now to track any changes over time
- Keep the area clean and dry and avoid scratching
- Do not apply any creams or treatments without medical advice
- Book an appointment with a certified dermatologist

WHEN TO SEEK CARE
Seek urgent medical attention if the area rapidly spreads, becomes very painful, or is accompanied by fever or swelling."""