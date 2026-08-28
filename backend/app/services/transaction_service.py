"""
Core transaction pipeline shared by deposit / withdraw / transfer routes:

  validate -> extract features -> AI risk analysis -> classify
  -> COMPLETED (settle funds) or ON_HOLD (open fraud case, no funds move)
"""
import random
import string
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import (
    Account, Beneficiary, Transaction, TransactionType, TransactionStatus,
    RiskProfile, RiskLevel, User,
)
from app.services.risk_engine import analyze_transaction
from app.services.fraud_service import open_fraud_case
from app.services.notification_service import notify_user
from app.services.audit_service import log_action
from app.config import settings


def generate_reference() -> str:
    return "TXN" + "".join(random.choices(string.digits, k=10))


def _customer_stats(db: Session, account: Account) -> dict:
    txns = (
        db.query(Transaction)
        .filter(
            (Transaction.sender_account_id == account.id)
            | (Transaction.receiver_account_id == account.id)
        )
        .filter(Transaction.status == TransactionStatus.COMPLETED)
        .all()
    )
    amounts = [float(t.amount) for t in txns]
    avg_amount = sum(amounts) / len(amounts) if amounts else float(account.balance) * 0.1 or 1000.0

    since = datetime.utcnow() - timedelta(hours=24)
    freq_24h = (
        db.query(func.count(Transaction.id))
        .filter(
            (Transaction.sender_account_id == account.id)
            | (Transaction.receiver_account_id == account.id)
        )
        .filter(Transaction.created_at >= since)
        .scalar()
    ) or 0

    prior_suspicious = (
        db.query(func.count(Transaction.id))
        .filter(
            (Transaction.sender_account_id == account.id)
            | (Transaction.receiver_account_id == account.id)
        )
        .filter(Transaction.risk_level == RiskLevel.HIGH)
        .scalar()
    ) or 0

    account_age_days = (datetime.utcnow() - account.created_at).days if account.created_at else 0

    return {
        "avg_amount": avg_amount,
        "freq_24h": freq_24h,
        "prior_suspicious": prior_suspicious,
        "account_age_days": account_age_days,
    }


async def process_deposit(db: Session, account: Account, amount: Decimal) -> Transaction:
    stats = _customer_stats(db, account)
    result = analyze_transaction(
        amount=float(amount), avg_txn_amount=stats["avg_amount"],
        txn_frequency_24h=stats["freq_24h"], is_new_beneficiary=False,
        prior_suspicious_count=stats["prior_suspicious"], account_age_days=stats["account_age_days"],
        balance=float(account.balance), is_transfer=False,
    )
    txn = Transaction(
        reference=generate_reference(), receiver_account_id=account.id, amount=amount,
        type=TransactionType.DEPOSIT, risk_score=result["risk_score"], risk_level=result["risk_level"],
        fraud_probability=Decimal(str(result["fraud_probability"])), risk_reasons=result["reasons"],
    )
    return await _finalize(db, txn, account, None, result)


async def process_withdrawal(db: Session, account: Account, amount: Decimal) -> Transaction:
    if Decimal(account.balance) < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    stats = _customer_stats(db, account)
    result = analyze_transaction(
        amount=float(amount), avg_txn_amount=stats["avg_amount"],
        txn_frequency_24h=stats["freq_24h"], is_new_beneficiary=False,
        prior_suspicious_count=stats["prior_suspicious"], account_age_days=stats["account_age_days"],
        balance=float(account.balance), is_transfer=False,
    )
    txn = Transaction(
        reference=generate_reference(), sender_account_id=account.id, amount=amount,
        type=TransactionType.WITHDRAWAL, risk_score=result["risk_score"], risk_level=result["risk_level"],
        fraud_probability=Decimal(str(result["fraud_probability"])), risk_reasons=result["reasons"],
    )
    return await _finalize(db, txn, account, None, result)


async def process_transfer(db: Session, account: Account, beneficiary: Beneficiary, amount: Decimal,
                            customer: User) -> Transaction:
    if Decimal(account.balance) < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    is_new_beneficiary = (datetime.utcnow() - beneficiary.created_at) < timedelta(hours=24)
    stats = _customer_stats(db, account)
    result = analyze_transaction(
        amount=float(amount), avg_txn_amount=stats["avg_amount"],
        txn_frequency_24h=stats["freq_24h"], is_new_beneficiary=is_new_beneficiary,
        prior_suspicious_count=stats["prior_suspicious"], account_age_days=stats["account_age_days"],
        balance=float(account.balance), is_transfer=True,
    )

    receiver_account = (
        db.query(Account).filter(Account.account_number == beneficiary.account_number).first()
    )

    txn = Transaction(
        reference=generate_reference(), sender_account_id=account.id,
        receiver_account_id=receiver_account.id if receiver_account else None,
        beneficiary_id=beneficiary.id, amount=amount, type=TransactionType.TRANSFER,
        risk_score=result["risk_score"], risk_level=result["risk_level"],
        fraud_probability=Decimal(str(result["fraud_probability"])), risk_reasons=result["reasons"],
        is_new_beneficiary=is_new_beneficiary,
    )
    return await _finalize(db, txn, account, customer, result)


async def process_upi_payment(db: Session, account: Account, amount: Decimal,
                              upi_id: str, merchant: str, customer: User) -> Transaction:
    if Decimal(account.balance) < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    stats = _customer_stats(db, account)
    result = analyze_transaction(
        amount=float(amount), avg_txn_amount=stats["avg_amount"],
        txn_frequency_24h=stats["freq_24h"], is_new_beneficiary=False,
        prior_suspicious_count=stats["prior_suspicious"], account_age_days=stats["account_age_days"],
        balance=float(account.balance), is_transfer=True,
    )
    txn = Transaction(
        reference=generate_reference(), sender_account_id=account.id, amount=amount,
        type=TransactionType.TRANSFER, risk_score=result["risk_score"], risk_level=result["risk_level"],
        fraud_probability=Decimal(str(result["fraud_probability"])), risk_reasons=result["reasons"],
    )
    return await _finalize(db, txn, account, customer, result,
                           extra_metadata={"channel": "UPI", "upi_id": upi_id, "merchant": merchant})


async def _finalize(db: Session, txn: Transaction, primary_account: Account, customer: User | None,
                     result: dict, extra_metadata: dict | None = None) -> Transaction:
    owner = customer or primary_account.owner

    if result["risk_score"] >= settings.RISK_HOLD_THRESHOLD:
        txn.status = TransactionStatus.ON_HOLD
        db.add(txn)
        db.flush()
        await open_fraud_case(db, txn, owner)
    else:
        txn.status = TransactionStatus.COMPLETED
        db.add(txn)
        db.flush()
        _settle(db, txn, primary_account)
        await notify_user(
            db, owner.id, "TRANSACTION", f"{txn.type.value.title()} Successful",
            f"Your {txn.type.value.lower()} of \u20b9{txn.amount:,.2f} was completed successfully.",
            metadata={"transaction_id": txn.id, **(extra_metadata or {})},
        )

    _update_risk_profile(db, owner.id, txn)
    log_action(db, owner.id, f"{txn.type.value}_INITIATED", "transaction", txn.id,
               {"amount": str(txn.amount), "status": txn.status.value, "risk_score": txn.risk_score})
    db.commit()
    db.refresh(txn)
    return txn


def _settle(db: Session, txn: Transaction, primary_account: Account) -> None:
    if txn.type == TransactionType.DEPOSIT:
        primary_account.balance = Decimal(primary_account.balance) + Decimal(txn.amount)
    elif txn.type == TransactionType.WITHDRAWAL:
        primary_account.balance = Decimal(primary_account.balance) - Decimal(txn.amount)
    elif txn.type == TransactionType.TRANSFER:
        primary_account.balance = Decimal(primary_account.balance) - Decimal(txn.amount)
        if txn.receiver_account_id:
            receiver: Account = db.query(Account).get(txn.receiver_account_id)
            receiver.balance = Decimal(receiver.balance) + Decimal(txn.amount)


async def process_bank_cash_deposit(db: Session, account: Account, amount: Decimal, banker: User) -> Transaction:
    """Branch/cashier deposit: trusted teller operation, not customer digital fraud scoring."""
    if account.status.value != "ACTIVE":
        raise HTTPException(status_code=400, detail=f"Account is {account.status.value}, cannot transact")
    txn = Transaction(reference=generate_reference(), receiver_account_id=account.id,
                      amount=amount, type=TransactionType.DEPOSIT, status=TransactionStatus.COMPLETED,
                      risk_score=0, risk_level=RiskLevel.LOW, fraud_probability=Decimal("0"),
                      risk_reasons=["Branch cashier operation — fraud scoring bypassed"], resolved_at=datetime.utcnow())
    db.add(txn); db.flush(); _settle(db, txn, account)
    owner = account.owner
    await notify_user(db, owner.id, "TRANSACTION", "Cash Deposit Completed",
                      f"A branch cash deposit of ₹{amount:,.2f} was posted to your account by the bank teller.",
                      metadata={"transaction_id": txn.id, "channel": "BRANCH_CASH"})
    log_action(db, banker.id, "BANK_CASH_DEPOSIT", "transaction", txn.id,
               {"account_number": account.account_number, "amount": str(amount)})
    db.commit(); db.refresh(txn); return txn


async def process_bank_cash_withdrawal(db: Session, account: Account, amount: Decimal, banker: User) -> Transaction:
    """Branch/cashier withdrawal: trusted teller operation, not customer digital fraud scoring."""
    if account.status.value != "ACTIVE":
        raise HTTPException(status_code=400, detail=f"Account is {account.status.value}, cannot transact")
    if Decimal(account.balance) < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    txn = Transaction(reference=generate_reference(), sender_account_id=account.id,
                      amount=amount, type=TransactionType.WITHDRAWAL, status=TransactionStatus.COMPLETED,
                      risk_score=0, risk_level=RiskLevel.LOW, fraud_probability=Decimal("0"),
                      risk_reasons=["Branch cashier operation — fraud scoring bypassed"], resolved_at=datetime.utcnow())
    db.add(txn); db.flush(); _settle(db, txn, account)
    owner = account.owner
    await notify_user(db, owner.id, "TRANSACTION", "Cash Withdrawal Completed",
                      f"A branch cash withdrawal of ₹{amount:,.2f} was posted to your account by the bank teller.",
                      metadata={"transaction_id": txn.id, "channel": "BRANCH_CASH"})
    log_action(db, banker.id, "BANK_CASH_WITHDRAWAL", "transaction", txn.id,
               {"account_number": account.account_number, "amount": str(amount)})
    db.commit(); db.refresh(txn); return txn


def _update_risk_profile(db: Session, customer_id: str, txn: Transaction) -> None:
    profile = db.query(RiskProfile).filter(RiskProfile.customer_id == customer_id).first()
    if not profile:
        profile = RiskProfile(customer_id=customer_id)
        db.add(profile)
        db.flush()

    completed = (
        db.query(Transaction)
        .join(Account, (Transaction.sender_account_id == Account.id) | (Transaction.receiver_account_id == Account.id))
        .filter(Account.user_id == customer_id, Transaction.status == TransactionStatus.COMPLETED)
        .all()
    )
    amounts = [float(t.amount) for t in completed]
    profile.avg_transaction_amount = Decimal(str(sum(amounts) / len(amounts))) if amounts else Decimal("0")
    profile.transaction_frequency = len(completed)
    profile.suspicious_transaction_count = (
        db.query(func.count(Transaction.id))
        .join(Account, (Transaction.sender_account_id == Account.id) | (Transaction.receiver_account_id == Account.id))
        .filter(Account.user_id == customer_id, Transaction.risk_level == RiskLevel.HIGH)
        .scalar()
    ) or 0
    profile.risk_score = txn.risk_score
    profile.risk_level = txn.risk_level
    profile.updated_at = datetime.utcnow()
