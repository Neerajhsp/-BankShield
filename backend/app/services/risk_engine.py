import os
from datetime import datetime
from typing import List

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
            _model_load_error = (
                f"Model file not found at {path}. "
                "Run ml/train_model.py to generate it."
            )
    except Exception as exc:
        _model_load_error = f"Failed to load model: {exc}"


def model_status() -> dict:
    _load_model()

    return {
        "loaded": _model is not None,
        "error": _model_load_error,
    }


def _rule_based_score(
    features: list,
    is_new_beneficiary: bool,
    amount: float,
    avg_txn_amount: float,
    txn_hour: int,
    balance_ratio: float,
) -> float:

    score = 0.0

    if avg_txn_amount > 0 and amount > avg_txn_amount * 5:
        score += 0.45

    if is_new_beneficiary:
        score += 0.20

    if txn_hour < 5 or txn_hour > 23:
        score += 0.10

    if balance_ratio < 1.2:
        score += 0.15

    if amount >= 300000:
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

    _load_model()

    txn_hour = (
        txn_hour
        if txn_hour is not None
        else datetime.utcnow().hour
    )

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

        raw_score = float(
            _model.decision_function(X)[0]
        )

        MIDPOINT = 0.04
        STEEPNESS = 25.0

        anomaly_probability = (
            1.0
            / (
                1.0
                + np.exp(
                    STEEPNESS * (raw_score - MIDPOINT)
                )
            )
        )

        anomaly_probability = float(
            min(
                max(anomaly_probability, 0.0),
                1.0,
            )
        )

    else:

        balance_ratio = balance / (amount + 1.0)

        anomaly_probability = _rule_based_score(
            features,
            is_new_beneficiary,
            amount,
            avg_txn_amount,
            txn_hour,
            balance_ratio,
        )

    ml_risk_score = int(
        round(anomaly_probability * 100)
    )

    risk_score = ml_risk_score

    if amount >= 300000:

        risk_score = max(
            risk_score,
            90,
        )

    elif amount >= 100000:

        risk_score = max(
            risk_score,
            80,
        )

    elif amount >= 50000:

        risk_score = max(
            risk_score,
            settings.RISK_LOW_MAX + 1,
        )

    if risk_score <= settings.RISK_LOW_MAX:

        risk_level = "LOW"

    elif risk_score <= settings.RISK_MEDIUM_MAX:

        risk_level = "MEDIUM"

    else:

        risk_level = "HIGH"

    fraud_probability = round(
        float(risk_score),
        2,
    )

    reasons: List[str] = []

    if amount >= 300000:

        reasons.append(
            "Very high-value transaction above ₹3,00,000"
        )

    elif amount >= 100000:

        reasons.append(
            "High-value transaction above ₹1,00,000 threshold"
        )

    elif amount >= 50000:

        reasons.append(
            "Large transaction above ₹50,000 threshold"
        )

    if (
        avg_txn_amount > 0
        and amount > avg_txn_amount * 3
    ):

        reasons.append(
            "Unusually high transaction amount "
            "relative to customer's normal activity"
        )

    if is_new_beneficiary:

        reasons.append(
            "New beneficiary detected"
        )

    if txn_frequency_24h >= 5:

        reasons.append(
            "Abnormal transaction frequency "
            "in the last 24 hours"
        )

    if txn_hour < 5 or txn_hour > 23:

        reasons.append(
            "Unusual transaction time"
        )

    balance_ratio = balance / (amount + 1.0)

    if balance_ratio < 1.2:

        reasons.append(
            "Transaction amount unusually high "
            "relative to account balance"
        )

    if prior_suspicious_count > 0:

        reasons.append(
            "Customer has prior suspicious "
            "transaction history"
        )

    if (
        account_age_days < 30
        and amount > 50000
    ):

        reasons.append(
            "Large transaction on a relatively "
            "new account"
        )

    if (
        is_transfer
        and amount >= 100000
    ):

        reasons.append(
            "High-value fund transfer detected"
        )

    if (
        not reasons
        and risk_level != "LOW"
    ):

        reasons.append(
            "Transaction pattern deviates "
            "from anomaly-detection baseline"
        )

    return {
        "risk_score": risk_score,
        "fraud_probability": fraud_probability,
        "risk_level": risk_level,
        "reasons": reasons,
        "model_used": _model is not None,
    }