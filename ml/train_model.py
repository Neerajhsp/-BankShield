"""
Trains the BankShield AI fraud-detection model.

  1. Load ml/dataset.csv
  2. Clean data
  3. Engineer features (already present as columns, matching
     app/ml/feature_engineering.py)
  4. Train an Isolation Forest anomaly-detection model
  5. Evaluate against the synthetic is_fraud label
  6. Save the fitted model to ml/fraud_model.pkl

Run:
    cd ml
    python train_model.py

If ml/dataset.csv is missing, run generate_dataset.py first (or supply
your own real transaction export with the same columns).
"""
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split

FEATURE_COLUMNS = [
    "amount", "avg_txn_amount", "amount_deviation", "txn_frequency_24h",
    "txn_hour", "is_new_beneficiary", "prior_suspicious_count",
    "account_age_days", "balance_to_amount_ratio", "is_transfer",
]

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(HERE, "dataset.csv")
MODEL_PATH = os.path.join(HERE, "fraud_model.pkl")


def main():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(
            f"{DATASET_PATH} not found. Run `python generate_dataset.py` first, "
            "or replace it with a real transaction export using the same columns."
        )

    print("1. Loading dataset...")
    df = pd.read_csv(DATASET_PATH)

    print("2. Cleaning data...")
    df = df.dropna(subset=FEATURE_COLUMNS)
    df = df[df["amount"] > 0]

    print("3. Preparing feature matrix...")
    X = df[FEATURE_COLUMNS].values
    y = df["is_fraud"].values if "is_fraud" in df.columns else None

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if y is not None else None
    )

    print("4. Training Isolation Forest...")
    # contamination approximates the expected fraud rate in the training data
    contamination = float(np.clip((y_train == 1).mean() if y is not None else 0.06, 0.01, 0.2))
    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples="auto",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train)

    print("5. Evaluating...")
    if y_test is not None:
        # IsolationForest.predict: -1 = anomaly (fraud-like), 1 = normal
        raw_pred = model.predict(X_test)
        y_pred = np.where(raw_pred == -1, 1, 0)

        decision = model.decision_function(X_test)
        # lower decision score = more anomalous -> higher fraud-likelihood
        fraud_score = 1.0 / (1.0 + np.exp(decision * 4))

        print(classification_report(y_test, y_pred, target_names=["normal", "fraud"]))
        try:
            auc = roc_auc_score(y_test, fraud_score)
            print(f"ROC-AUC: {auc:.4f}")
        except ValueError:
            pass

    print("6. Saving model...")
    joblib.dump(model, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
