# BankShield AI — ML Risk Engine

## Files
- `generate_dataset.py` — creates `dataset.csv`, a synthetic but realistic
  transaction dataset (2000 normal + 120 fraud-labeled rows) matching the
  feature schema used at inference time.
- `dataset.csv` — the generated training data (already included).
- `train_model.py` — trains an `IsolationForest` anomaly-detection model on
  the feature columns, evaluates it against the synthetic `is_fraud` label,
  and saves it to `fraud_model.pkl`.
- `fraud_model.pkl` — the trained model (already included, ready to use).

## Regenerating the model
```bash
cd ml
python generate_dataset.py   # optional — dataset.csv is already committed
python train_model.py
```

## Evaluation (on the included dataset)
```
              precision    recall  f1-score   support
      normal       1.00      1.00      1.00       400
       fraud       0.96      0.92      0.94        24
    accuracy                           0.99       424
ROC-AUC: 0.9992
```

## Calibration
`IsolationForest.decision_function()` returns a raw anomaly score (higher =
more normal). `backend/app/services/risk_engine.py` converts this into a
0-100 risk score with a logistic curve centered on the midpoint between the
average "normal" and average "fraud" raw scores observed on this dataset
(`MIDPOINT = 0.04`, `STEEPNESS = 25.0`). If you retrain on different/real
data, re-check the fraud vs. normal raw `decision_function` means (see the
snippet in `train_model.py`'s evaluation step) and adjust those two
constants so HIGH-risk cases land at or above 70/100.

## Never crashes without the model
If `fraud_model.pkl` is missing or fails to load, `risk_engine.py` logs a
warning at startup and falls back to a transparent rule-based scorer instead
of crashing the API — see `model_status()` / `/api/health`.
