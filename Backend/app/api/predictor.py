import pickle
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user_optional
from app.db.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/api", tags=["predictor"])

_model = None
_model_load_error = None
try:
    model_path = Path(settings.ML_MODEL_PATH)
    if model_path.exists():
        with open(model_path, "rb") as f:
            _model = pickle.load(f)
    else:
        _model_load_error = f"Model file not found at {model_path}"
except Exception as exc:  # pragma: no cover
    _model_load_error = str(exc)

_RECOMMENDATIONS = {
    "Flood": [
        "Move valuables and documents to higher ground.",
        "Identify two evacuation routes in case one floods.",
        "Prepare a 3-day emergency kit with water and non-perishable food.",
    ],
    "Heatwave": [
        "Stay hydrated and avoid outdoor activity during peak hours.",
        "Check on elderly or vulnerable neighbours.",
        "Keep living spaces ventilated or cooled where possible.",
    ],
    "Storm": [
        "Secure loose outdoor items that could become projectiles.",
        "Charge devices and keep an emergency kit accessible.",
        "Monitor official weather bulletins for updates.",
    ],
    "Normal Conditions": [
        "No elevated risk detected from these inputs — good time to review your emergency kit.",
        "Consider completing a preparedness course while conditions are calm.",
    ],
}


@router.post("/predict", response_model=schemas.PredictResponse)
def predict(
    data: schemas.PredictRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional),
):
    if _model is None:
        raise HTTPException(status_code=503, detail=f"ML model unavailable: {_model_load_error}")

    input_df = pd.DataFrame([[data.rainfall, data.temperature, data.humidity]],
                             columns=["Rainfall", "Temperature", "Humidity"])
    try:
        prediction = int(_model.predict(input_df)[0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    # Only report a confidence figure if the model genuinely exposes calibrated
    # probabilities — never fabricate one.
    confidence = None
    if hasattr(_model, "predict_proba"):
        try:
            proba = _model.predict_proba(input_df)[0]
            confidence = float(max(proba))
        except Exception:
            confidence = None

    if data.rainfall > 100:
        disaster_type = "Flood"
    elif data.temperature > 40:
        disaster_type = "Heatwave"
    elif data.humidity > 85:
        disaster_type = "Storm"
    else:
        disaster_type = "Normal Conditions"

    risk_interpretation = (
        f"The model flags conditions consistent with elevated {disaster_type.lower()} risk "
        f"based on the rainfall, temperature and humidity you entered."
        if prediction == 1 and disaster_type != "Normal Conditions"
        else "Conditions entered do not strongly match the historical patterns the model associates with disaster occurrence."
    )

    db.add(models.PredictionHistory(
        user_id=current_user.id if current_user else None,
        rainfall=data.rainfall,
        temperature=data.temperature,
        humidity=data.humidity,
        predicted_label=prediction,
        disaster_type=disaster_type,
        model_confidence=confidence,
    ))
    db.commit()

    return schemas.PredictResponse(
        prediction_label=prediction,
        disaster_type=disaster_type,
        model_confidence=confidence,
        risk_interpretation=risk_interpretation,
        recommended_steps=_RECOMMENDATIONS.get(disaster_type, _RECOMMENDATIONS["Normal Conditions"]),
    )
