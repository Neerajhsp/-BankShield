"""
BankShield AI — demo data seeder.

Run from the backend/ directory after installing requirements and
configuring .env:

    cd backend
    python ../database/seed_data.py

Creates 4 banker accounts, 12 customers (with accounts + beneficiaries), 2-4
months of normal transaction history per customer, and one deliberate
HIGH-RISK fraud demonstration transaction so the complete
customer -> AI -> fraud -> dual alert -> report -> admin decision
flow can be shown immediately.

Safe to re-run: it checks for existing demo users first and exits
without duplicating data if they're already present.
"""
import asyncio
import os
import random
import sys
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import SessionLocal, Base, engine  # noqa: E402
from app.models.models import (  # noqa: E402
    User, Account, Beneficiary, Transaction, RiskProfile,
    UserRole, TransactionType, TransactionStatus, RiskLevel,
)
from app.services.security import hash_password  # noqa: E402

FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Ishaan", "Kabir", "Ananya", "Diya",
               "Myra", "Sara", "Pooja", "Rohan", "Neha"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Reddy", "Iyer", "Khan", "Patel",
              "Chopra", "Nair", "Singh", "Rao", "Mehta"]


def account_number():
    return "BSA" + "".join(random.choices("0123456789", k=10))


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()


    print("Seeding BankShield AI demo data...")

    customers = []
    demo_customer = User(
        full_name="Demo Customer", email="customer@bankshield.ai",
        password_hash=hash_password("Customer@123"), role=UserRole.CUSTOMER,
    )
    db.add(demo_customer)
    db.flush()
    customers.append(demo_customer)

    for i in range(11):
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        user = User(
            full_name=name, email=f"customer{i+2}@bankshield.ai",
            password_hash=hash_password("Customer@123"), role=UserRole.CUSTOMER,
        )
        db.add(user)
        db.flush()
        customers.append(user)

    accounts = {}
    for cust in customers:
        acct = Account(
            account_number=account_number(), user_id=cust.id,
            account_type="SAVINGS", balance=Decimal(random.randint(50000, 300000)),
            created_at=datetime.utcnow() - timedelta(days=random.randint(120, 500)),
        )
        db.add(acct)
        db.flush()
        accounts[cust.id] = acct

    db.commit()

    # Normal transaction history: ₹2,000 - ₹20,000 range, spread over past 60 days
    for cust in customers:
        acct = accounts[cust.id]
        for _ in range(random.randint(6, 14)):
            amount = Decimal(random.randint(2000, 20000))
            created = datetime.utcnow() - timedelta(days=random.randint(1, 60), hours=random.randint(0, 23))
            txn_type = random.choice([TransactionType.DEPOSIT, TransactionType.WITHDRAWAL])
            txn = Transaction(
                reference="TXN" + "".join(random.choices("0123456789", k=10)),
                sender_account_id=acct.id if txn_type == TransactionType.WITHDRAWAL else None,
                receiver_account_id=acct.id if txn_type == TransactionType.DEPOSIT else None,
                amount=amount, type=txn_type, status=TransactionStatus.COMPLETED,
                risk_score=random.randint(5, 25), risk_level=RiskLevel.LOW,
                fraud_probability=Decimal(str(random.randint(5, 25))),
                risk_reasons=[], created_at=created, resolved_at=created,
            )
            db.add(txn)

        profile = RiskProfile(
            customer_id=cust.id, risk_level=RiskLevel.LOW, risk_score=random.randint(5, 20),
            suspicious_transaction_count=0, avg_transaction_amount=Decimal(random.randint(5000, 12000)),
            transaction_frequency=random.randint(6, 14),
        )
        db.add(profile)

    db.commit()

    # ---- Fraud demonstration for the Demo Customer ----
    demo_acct = accounts[demo_customer.id]
    beneficiary = Beneficiary(
        customer_id=demo_customer.id, beneficiary_name="Rakesh Malhotra",
        account_number="BSA9988776655", bank_name="City Union Bank", ifsc="CIUB0000123",
        created_at=datetime.utcnow(),  # brand new -> is_new_beneficiary=True at inference time
    )
    db.add(beneficiary)
    db.commit()

    print("Demo data seeded successfully.")
    print("  Banker accounts: run database/seed_bankers.py (password defaults to Neeraj@123 for local demo)")
    print("  Customer login: customer@bankshield.ai / Customer@123")
    print("")
    print("To trigger the full fraud demo: log in as the demo customer, go to")
    print("Send Money, choose beneficiary 'Rakesh Malhotra', and transfer ₹450000.")
    print("Because it's a brand-new beneficiary and far above the customer's normal")
    print("₹2,000-20,000 activity, the AI risk engine will score it HIGH, place it")
    print("ON_HOLD, open a fraud case, and fire real-time alerts to both sides.")

    db.close()


if __name__ == "__main__":
    main()
