"""
Admin routes: dashboard analytics, customer/transaction/fraud-case
management, fraud incident reports, audit logs.
"""
from datetime import datetime, timedelta
from decimal import Decimal
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    User, Account, Transaction, FraudCase, AuditLog,
    TransactionType, TransactionStatus, RiskLevel, FraudCaseStatus, UserRole,
)
from app.schemas.schemas import UserOut, TransactionOut, FraudCaseOut, AuditLogOut, BankCashRequest, BankCustomerCreate, BankCustomerCreatedOut
from app.services.security import get_current_user, require_role
from app.services.fraud_service import resolve_fraud_case
from app.services import transaction_service
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/admin", tags=["Admin"])
admin_only = require_role("ADMIN")


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    total_customers = db.query(func.count(User.id)).filter(User.role == UserRole.CUSTOMER).scalar() or 0
    total_accounts = db.query(func.count(Account.id)).scalar() or 0
    total_transactions = db.query(func.count(Transaction.id)).scalar() or 0

    total_deposits = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.type == TransactionType.DEPOSIT, Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    total_withdrawals = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.type == TransactionType.WITHDRAWAL, Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    transfer_volume = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.type == TransactionType.TRANSFER, Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0

    suspicious_txns = db.query(func.count(Transaction.id)).filter(
        Transaction.risk_level == RiskLevel.HIGH
    ).scalar() or 0
    open_cases = db.query(func.count(FraudCase.id)).filter(
        FraudCase.status.in_([FraudCaseStatus.OPEN, FraudCaseStatus.UNDER_REVIEW])
    ).scalar() or 0
    high_risk_customers = db.query(func.count(func.distinct(FraudCase.customer_id))).filter(
        FraudCase.status.in_([FraudCaseStatus.OPEN, FraudCaseStatus.UNDER_REVIEW])
    ).scalar() or 0

    since = datetime.utcnow() - timedelta(days=14)
    daily_volume = (
        db.query(func.date(Transaction.created_at).label("day"), func.sum(Transaction.amount))
        .filter(Transaction.created_at >= since, Transaction.status == TransactionStatus.COMPLETED)
        .group_by("day").order_by("day").all()
    )
    risk_distribution = (
        db.query(Transaction.risk_level, func.count(Transaction.id))
        .group_by(Transaction.risk_level).all()
    )
    type_distribution = (
        db.query(Transaction.type, func.count(Transaction.id))
        .group_by(Transaction.type).all()
    )
    fraud_cases_over_time = (
        db.query(func.date(FraudCase.created_at).label("day"), func.count(FraudCase.id))
        .filter(FraudCase.created_at >= since)
        .group_by("day").order_by("day").all()
    )

    return {
        "cards": {
            "total_customers": total_customers,
            "total_accounts": total_accounts,
            "total_transactions": total_transactions,
            "total_deposits": float(total_deposits),
            "total_withdrawals": float(total_withdrawals),
            "transfer_volume": float(transfer_volume),
            "suspicious_transactions": suspicious_txns,
            "open_fraud_cases": open_cases,
            "high_risk_customers": high_risk_customers,
        },
        "charts": {
            "daily_volume": [{"day": str(d), "amount": float(a)} for d, a in daily_volume],
            "risk_distribution": [{"level": lvl.value, "count": c} for lvl, c in risk_distribution],
            "type_distribution": [{"type": t.value, "count": c} for t, c in type_distribution],
            "fraud_cases_over_time": [{"day": str(d), "count": c} for d, c in fraud_cases_over_time],
        },
    }


@router.get("/customers", response_model=list[UserOut])
def list_customers(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    return db.query(User).filter(User.role == UserRole.CUSTOMER).order_by(User.created_at.desc()).all()


@router.get("/transactions", response_model=list[TransactionOut])
def list_all_transactions(db: Session = Depends(get_db), admin: User = Depends(admin_only), limit: int = 200):
    return db.query(Transaction).order_by(Transaction.created_at.desc()).limit(limit).all()


@router.get("/fraud-cases", response_model=list[FraudCaseOut])
def list_fraud_cases(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    return db.query(FraudCase).order_by(FraudCase.created_at.desc()).all()


@router.get("/fraud-reports", response_model=list[FraudCaseOut])
def list_fraud_reports(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    """Same underlying data as fraud-cases, exposed separately per the
    dedicated 'Fraud Reports' admin page (view / print / download report)."""
    return db.query(FraudCase).order_by(FraudCase.created_at.desc()).all()


@router.get("/fraud-reports/{case_id}")
def get_fraud_report(case_id: str, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    case = db.query(FraudCase).filter(FraudCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fraud case not found")
    txn = db.query(Transaction).filter(Transaction.id == case.transaction_id).first()
    customer = db.query(User).filter(User.id == case.customer_id).first()
    account = txn.sender_account or txn.receiver_account

    masked_account = "****" + account.account_number[-4:] if account else "N/A"

    return {
        "report_title": "BANKSHIELD AI — FRAUD INCIDENT REPORT",
        "case_number": case.case_number,
        "transaction_id": txn.id,
        "transaction_reference": txn.reference,
        "customer_id": customer.id,
        "customer_name": customer.full_name,
        "masked_account_number": masked_account,
        "amount": float(case.amount),
        "transaction_type": txn.type.value,
        "date_time": txn.created_at.isoformat(),
        "risk_score": case.risk_score,
        "fraud_probability": float(case.fraud_probability),
        "risk_level": case.risk_level.value,
        "detection_reasons": case.detection_reasons,
        "is_new_beneficiary": txn.is_new_beneficiary,
        "transaction_status": txn.status.value,
        "customer_notified": case.customer_notified,
        "admin_notified": case.admin_notified,
        "alert_sound_triggered": case.alert_sound_triggered,
        "admin_decision": case.admin_decision,
        "reviewed_by": case.reviewed_by,
        "resolution_timestamp": case.resolved_at.isoformat() if case.resolved_at else None,
        "case_status": case.status.value,
    }


@router.post("/fraud-cases/{case_id}/approve")
async def approve_fraud_case(case_id: str,
                              db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    return await _decide(case_id, "APPROVE", db, admin)


@router.post("/fraud-cases/{case_id}/block")
async def block_fraud_case(case_id: str,
                            db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    return await _decide(case_id, "BLOCK", db, admin)


async def _decide(case_id: str, decision: str, db: Session, admin: User):
    case = db.query(FraudCase).filter(FraudCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fraud case not found")
    if case.status not in (FraudCaseStatus.OPEN, FraudCaseStatus.UNDER_REVIEW):
        raise HTTPException(status_code=400, detail=f"Case already resolved as {case.status.value}")

    txn = db.query(Transaction).filter(Transaction.id == case.transaction_id).first()
    if txn.status != TransactionStatus.ON_HOLD:
        raise HTTPException(status_code=400, detail="Transaction is not on hold")

    await resolve_fraud_case(db, case, txn, decision, admin)
    db.commit()
    return {"detail": f"Case {case.case_number} {decision.lower()}d", "transaction_status": txn.status.value}


def _new_account_number(db: Session) -> str:
    for _ in range(20):
        number = "BSA" + "".join(random.choices("0123456789", k=10))
        if not db.query(Account).filter(Account.account_number == number).first():
            return number
    raise HTTPException(status_code=500, detail="Unable to generate a unique account number")


@router.post("/customers", response_model=BankCustomerCreatedOut)
def create_customer(payload: BankCustomerCreate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    # Banker-created customers receive a temporary password that is returned once.
    # The customer can immediately use Forgot password to set a private password.
    from app.services.security import hash_password
    temp_password = "Welcome@123"
    customer = User(full_name=payload.full_name, email=payload.email,
                    password_hash=hash_password(temp_password), role=UserRole.CUSTOMER,
                    phone=payload.phone)
    db.add(customer); db.flush()
    account = Account(account_number=_new_account_number(db), user_id=customer.id,
                      account_type=payload.account_type.upper(), balance=payload.opening_balance)
    db.add(account)
    db.flush()
    if payload.opening_balance > 0:
        opening_txn = Transaction(
            reference=transaction_service.generate_reference(), receiver_account_id=account.id,
            amount=payload.opening_balance, type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED, risk_score=0, risk_level=RiskLevel.LOW,
            fraud_probability=Decimal("0"), risk_reasons=["Account opening balance — banker operation"],
            resolved_at=datetime.utcnow(),
        )
        db.add(opening_txn)
        db.flush()
    log_action(db, admin.id, "BANKER_CREATE_CUSTOMER", "user", customer.id,
               {"account_number": account.account_number, "opening_balance": str(payload.opening_balance)})
    db.commit(); db.refresh(customer); db.refresh(account)
    return {"customer": customer, "account": account, "temporary_password": temp_password}


@router.post("/customers/{customer_id}/activate")
def activate_customer(customer_id: str, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    customer = db.query(User).filter(User.id == customer_id, User.role == UserRole.CUSTOMER).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.is_active = True
    log_action(db, admin.id, "CUSTOMER_ACTIVATED", "user", customer.id, {})
    db.commit()
    return {"detail": "Customer activated"}


@router.post("/cash-deposit", response_model=TransactionOut)
async def cash_deposit(payload: BankCashRequest, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    account = db.query(Account).filter(Account.account_number == payload.account_number).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    txn = await transaction_service.process_bank_cash_deposit(db, account, payload.amount, admin)
    return txn


@router.post("/cash-withdrawal", response_model=TransactionOut)
async def cash_withdrawal(payload: BankCashRequest, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    account = db.query(Account).filter(Account.account_number == payload.account_number).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    txn = await transaction_service.process_bank_cash_withdrawal(db, account, payload.amount, admin)
    return txn


@router.get("/accounts/lookup/{account_number}")
def lookup_account(account_number: str, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    owner = db.query(User).filter(User.id == account.user_id).first()
    return {"account_number": account.account_number, "account_type": account.account_type,
            "balance": float(account.balance), "status": account.status.value,
            "customer_name": owner.full_name if owner else "", "customer_email": owner.email if owner else "",
            "customer_phone": owner.phone if owner else ""}


@router.get("/insights")
def insights(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    total = db.query(func.count(Transaction.id)).scalar() or 0
    high = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.HIGH).scalar() or 0
    medium = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.MEDIUM).scalar() or 0
    completed = db.query(func.count(Transaction.id)).filter(Transaction.status == TransactionStatus.COMPLETED).scalar() or 0
    held = db.query(func.count(Transaction.id)).filter(Transaction.status == TransactionStatus.ON_HOLD).scalar() or 0
    avg_risk = db.query(func.avg(Transaction.risk_score)).scalar() or 0
    top_reasons = {}
    for txn in db.query(Transaction).filter(Transaction.risk_reasons.isnot(None)).all():
        for reason in (txn.risk_reasons or []):
            top_reasons[reason] = top_reasons.get(reason, 0) + 1
    top_reasons = sorted(({"reason": k, "count": v} for k, v in top_reasons.items()), key=lambda x: x["count"], reverse=True)[:8]
    by_type = db.query(Transaction.type, func.count(Transaction.id), func.sum(Transaction.amount)).group_by(Transaction.type).all()
    return {
        "summary": {"total_transactions": total, "high_risk": high, "medium_risk": medium,
                    "completed": completed, "on_hold": held, "avg_risk_score": round(float(avg_risk), 2),
                    "high_risk_rate": round((high / total * 100), 2) if total else 0},
        "top_risk_reasons": top_reasons,
        "transaction_mix": [{"type": t.value, "count": c, "amount": float(a or 0)} for t, c, a in by_type],
    }


@router.get("/audit-logs", response_model=list[AuditLogOut])
def list_audit_logs(db: Session = Depends(get_db), admin: User = Depends(admin_only), limit: int = 200):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
