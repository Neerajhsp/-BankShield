"""
Feature engineering shared between training (ml/train_model.py) and
real-time inference (app/services/risk_engine.py).

Feature vector (order matters — must match train_model.py):
  0. amount
  1. avg_txn_amount        - customer's historical average transaction amount
  2. amount_deviation      - (amount - avg) / (avg + 1)
  3. txn_frequency_24h     - number of transactions by customer in last 24h
  4. txn_hour              - hour of day (0-23) transaction was initiated
  5. is_new_beneficiary    - 1 if beneficiary was created in this txn's session, else 0
  6. prior_suspicious_count- number of previous HIGH-risk transactions by customer
  7. account_age_days      - age of sender account in days
  8. balance_to_amount_ratio - balance / (amount + 1)
  9. is_transfer           - 1 if TRANSFER type else 0
"""
from datetime import datetime
from typing import Optional

FEATURE_NAMES = [
    "amount",
    "avg_txn_amount",
    "amount_deviation",
    "txn_frequency_24h",
    "txn_hour",
    "is_new_beneficiary",
    "prior_suspicious_count",
    "account_age_days",
    "balance_to_amount_ratio",
    "is_transfer",
]


def build_feature_vector(
    amount: float,
    avg_txn_amount: float,
    txn_frequency_24h: int,
    txn_hour: int,
    is_new_beneficiary: bool,
    prior_suspicious_count: int,
    account_age_days: int,
    balance: float,
    is_transfer: bool,
) -> list:
    amount_deviation = (amount - avg_txn_amount) / (avg_txn_amount + 1.0)
    balance_to_amount_ratio = balance / (amount + 1.0)
    return [
        float(amount),
        float(avg_txn_amount),
        float(amount_deviation),
        int(txn_frequency_24h),
        int(txn_hour),
        1 if is_new_beneficiary else 0,
        int(prior_suspicious_count),
        int(account_age_days),
        float(balance_to_amount_ratio),
        1 if is_transfer else 0,
    ]
