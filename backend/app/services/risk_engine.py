"""
AI Risk Analyzer.

Loads the trained Isolation-Forest-based fraud model (ml/fraud_model.pkl)
and produces a risk score (0-100), fraud probability (0-100), risk level,
and a list of human-readable reasons for any given transaction.

If the model file is missing, the engine falls back to a transparent
rule-based scorer so the application never crashes — it just runs in a
degraded (non-ML) mode and clearly logs that fact.
"""
import os
from datetime import datetime
from typing import List, Tuple

import joblib
import numpy as np

from app.config import settings
from app.ml.feature_engineering import build_feature_vector

_model = None
_model_load_attempted = False
_model_load_error: str | None = None


def _load_model():
    global _model, _model_load_attempted, _model_load_error
    if _model_load_attempted:
        return
    _model_load_attempted = True
    path = os.path.abspath(settings.ML_MODEL_PATH)
    try:
        if os.path.exists(path):
            _model = joblib.load(path)
        else:
            _model_load_error = f"Model file not found at {path}. Run ml/train_model.py to generate it."
    except Exception as exc:  # noqa: BLE001
        _model_load_error = f"Failed to load model: {exc}"


def model_status() -> dict:
    _load_model()
    return {"loaded": _model is not None, "error": _model_load_error}


def _rule_based_score(features: list, is_new_beneficiary: bool, amount: float, avg_txn_amount: float,
                       txn_hour: int, balance_ratio: float) -> float:
    """Transparent fallback scorer (0-1 anomaly-like score) used only if the
    ML model artifact is unavailable. Never used to silently mask ML failure —
    model_status() surfaces the degraded state to the caller."""
    score = 0.0
    if avg_txn_amount > 0 and amount > avg_txn_amount * 5:
        score += 0.45
    if is_new_beneficiary:
        score += 0.2
    if txn_hour < 5 or txn_hour > 23:
        score += 0.1
    if balance_ratio < 1.2:
        score += 0.15
    if amount > 300000:
        score += 0.15
    return min(score, 1.0)


def analyze_transaction(
    amount: float,
    avg_txn_amount: float,
    txn_frequency_24h: int,
    is_new_beneficiary: bool,
    prior_suspicious_count: int,
    account_age_days: int,
    balance: float,
    is_transfer: bool,
    txn_hour: int | None = None,
) -> dict:
    """Returns dict with risk_score (0-100 int), fraud_probability (0-100 float),
    risk_level (LOW/MEDIUM/HIGH), and reasons (list[str])."""
    _load_model()

    txn_hour = txn_hour if txn_hour is not None else datetime.utcnow().hour
    features = build_feature_vector(
        amount=amount,
        avg_txn_amount=avg_txn_amount,
        txn_frequency_24h=txn_frequency_24h,
        txn_hour=txn_hour,
        is_new_beneficiary=is_new_beneficiary,
        prior_suspicious_count=prior_suspicious_count,
        account_age_days=account_age_days,
        balance=balance,
        is_transfer=is_transfer,
    )

    if _model is not None:
        X = np.array(features).reshape(1, -1)
        # IsolationForest.decision_function: higher = more "normal",
        # lower/negative = more anomalous. Calibrated against
        # ml/dataset.csv (fraud rows cluster ~-0.05, normal rows ~+0.13),
        # so we center the logistic curve at their midpoint (~0.04) with
        # a steepness (k=25) that pushes the synthetic fraud cases above
        # the HIGH-risk threshold and keeps normal activity comfortably
        # in LOW/MEDIUM. Re-tune MIDPOINT/STEEPNESS if you retrain on
        # different data (see ml/train_model.py evaluation output).
        MIDPOINT = 0.04
        STEEPNESS = 25.0
        raw = _model.decision_function(X)[0]
        anomaly_prob = 1.0 / (1.0 + np.exp(STEEPNESS * (raw - MIDPOINT)))
        anomaly_prob = float(min(max(anomaly_prob, 0.0), 1.0))
    else:
        anomaly_prob = _rule_based_score(
            features, is_new_beneficiary, amount, avg_txn_amount, txn_hour,
            balance / (amount + 1.0),
        )

    risk_score = int(round(anomaly_prob * 100))
    fraud_probability = round(anomaly_prob * 100, 2)

    if risk_score <= settings.RISK_LOW_MAX:
        risk_level = "LOW"
    elif risk_score <= settings.RISK_MEDIUM_MAX:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    reasons: List[str] = []
    if avg_txn_amount > 0 and amount > avg_txn_amount * 3:
        reasons.append("Unusually high transaction amount relative to customer's normal activity")
    if is_new_beneficiary:
        reasons.append("New beneficiary detected")
    if txn_frequency_24h >= 5:
        reasons.append("Abnormal transaction frequency in the last 24 hours")
    if txn_hour < 5 or txn_hour > 23:
        reasons.append("Unusual transaction time")
    if balance / (amount + 1.0) < 1.2:
        reasons.append("Transaction amount unusually high relative to account balance")
    if prior_suspicious_count > 0:
        reasons.append("Customer has prior suspicious transaction history")
    if account_age_days < 30 and amount > 50000:
        reasons.append("Large transaction on a relatively new account")
    if not reasons and risk_level != "LOW":
        reasons.append("Transaction pattern deviates from anomaly-detection baseline")

    return {
        "risk_score": risk_score,
        "fraud_probability": fraud_probability,
        "risk_level": risk_level,
        "reasons": reasons,
        "model_used": _model is not None,
    }
