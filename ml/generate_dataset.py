"""
Generates ml/dataset.csv — a realistic synthetic banking-transaction
dataset used to train the Isolation Forest fraud model.

Feature columns match app/ml/feature_engineering.py exactly:
  amount, avg_txn_amount, amount_deviation, txn_frequency_24h, txn_hour,
  is_new_beneficiary, prior_suspicious_count, account_age_days,
  balance_to_amount_ratio, is_transfer, is_fraud (label, for evaluation only)
"""
import random
import csv
import os

random.seed(42)

rows = []

# ~2000 NORMAL transactions
for _ in range(2000):
    avg_amount = random.uniform(3000, 25000)
    amount = max(100, random.gauss(avg_amount, avg_amount * 0.35))
    balance = random.uniform(20000, 400000)
    row = {
        "amount": round(amount, 2),
        "avg_txn_amount": round(avg_amount, 2),
        "amount_deviation": round((amount - avg_amount) / (avg_amount + 1), 4),
        "txn_frequency_24h": random.randint(0, 3),
        "txn_hour": random.choices(range(24), weights=[1]*6 + [4]*12 + [2]*6)[0],
        "is_new_beneficiary": random.choices([0, 1], weights=[85, 15])[0],
        "prior_suspicious_count": 0,
        "account_age_days": random.randint(30, 2000),
        "balance_to_amount_ratio": round(balance / (amount + 1), 4),
        "is_transfer": random.choices([0, 1], weights=[50, 50])[0],
        "is_fraud": 0,
    }
    rows.append(row)

# ~120 FRAUDULENT / high-risk transactions
for _ in range(120):
    avg_amount = random.uniform(3000, 15000)
    amount = avg_amount * random.uniform(6, 40)  # way above normal
    balance = random.uniform(5000, 60000)  # relatively low balance vs amount
    row = {
        "amount": round(amount, 2),
        "avg_txn_amount": round(avg_amount, 2),
        "amount_deviation": round((amount - avg_amount) / (avg_amount + 1), 4),
        "txn_frequency_24h": random.randint(3, 9),
        "txn_hour": random.choices(range(24), weights=[6]*6 + [1]*12 + [3]*6)[0],
        "is_new_beneficiary": random.choices([0, 1], weights=[15, 85])[0],
        "prior_suspicious_count": random.randint(0, 3),
        "account_age_days": random.randint(1, 400),
        "balance_to_amount_ratio": round(balance / (amount + 1), 4),
        "is_transfer": 1,
        "is_fraud": 1,
    }
    rows.append(row)

random.shuffle(rows)

out_path = os.path.join(os.path.dirname(__file__), "dataset.csv")
with open(out_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

print(f"Wrote {len(rows)} rows to {out_path}")
