from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def predict_dummy():
    return {"prediction": "dummy_output"}