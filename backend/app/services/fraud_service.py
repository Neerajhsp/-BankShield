"""
Orchestrates the fraud-response pipeline for a HIGH-risk transaction:

  transaction (ON_HOLD)
    -> create FraudCase (FC-YYYY-XXXXX)
    -> notify customer (WS + DB notification, beep flag set)
    -> notify admin role (WS broadcast, beep flag set)
    -> audit log

Also handles the admin APPROVE / BLOCK decision that resolves a case.
"""
import random
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.models import FraudCase, Transaction, User, Account, TransactionStatus, FraudCaseStatus
from app.services.notification_service import notify_user, notify_role
from app.services.audit_service import log_action
from app.services.notification_channels import send_email, send_sms


def generate_case_number() -> str:
    year = datetime.utcnow().year
    suffix = random.randint(10000, 99999)
    return f"FC-{year}-{suffix}"


async def open_fraud_case(db: Session, txn: Transaction, customer: User) -> FraudCase:
    case = FraudCase(
        case_number=generate_case_number(),
        transaction_id=txn.id,
        customer_id=customer.id,
        amount=txn.amount,
        risk_score=txn.risk_score,
        fraud_probability=txn.fraud_probability,
        risk_level=txn.risk_level,
        detection_reasons=txn.risk_reasons,
        status=FraudCaseStatus.OPEN,
    )
    db.add(case)
    db.flush()

    reasons_str = "; ".join(txn.risk_reasons or [])
    customer_msg = (
        f"We put a hold on a {txn.type.value.lower()} of \u20b9{txn.amount:,.2f} "
        f"(risk score {txn.risk_score}/100). Reasons: {reasons_str}. "
        f"Our team is reviewing it now."
    )
    await notify_user(
        db, customer.id, "FRAUD", "Transaction On Hold — Security Review",
        customer_msg, metadata={"transaction_id": txn.id, "case_number": case.case_number},
    )
    case.customer_notified = True

    # Real email/SMS are optional and configured through .env. The in-app
    # notification and WebSocket alert above remain available without them.
    if customer.email:
        send_email(customer.email, "BankShield AI: High-risk transaction alert", customer_msg)
    if customer.phone:
        send_sms(customer.phone, f"BankShield alert: {txn.type.value.title()} of Rs {txn.amount:,.2f} is on hold. Case {case.case_number}.")

    admin_msg = (
        f"HIGH-RISK transaction {txn.reference} for \u20b9{txn.amount:,.2f} by "
        f"{customer.full_name} flagged (score {txn.risk_score}/100). Case {case.case_number} opened."
    )
    await notify_role(
        db, "ADMIN", "FRAUD", "New Fraud Case Opened", admin_msg,
        metadata={"transaction_id": txn.id, "case_number": case.case_number, "customer_id": customer.id},
    )
    case.admin_notified = True
    case.alert_sound_triggered = True

    log_action(db, customer.id, "FRAUD_CASE_CREATED", "fraud_case", case.id,
               {"case_number": case.case_number, "risk_score": txn.risk_score})

    db.flush()
    return case


async def resolve_fraud_case(db: Session, case: FraudCase, txn: Transaction, decision: str,
                              admin: User) -> None:
    """decision: 'APPROVE' or 'BLOCK'"""
    case.admin_decision = decision
    case.reviewed_by = admin.id
    case.resolved_at = datetime.utcnow()

    if decision == "APPROVE":
        case.status = FraudCaseStatus.RESOLVED
        txn.status = TransactionStatus.COMPLETED
        _settle_funds(db, txn)
        msg = f"Your held transaction {txn.reference} for \u20b9{txn.amount:,.2f} was approved and completed."
    else:
        case.status = FraudCaseStatus.BLOCKED
        txn.status = TransactionStatus.BLOCKED
        msg = f"Your held transaction {txn.reference} for \u20b9{txn.amount:,.2f} was blocked by our security team."

    txn.resolved_at = datetime.utcnow()

    await notify_user(db, txn_customer_id(db, txn), "FRAUD", "Fraud Case Resolved", msg,
                       metadata={"transaction_id": txn.id, "case_number": case.case_number, "decision": decision})

    log_action(db, admin.id, f"FRAUD_CASE_{decision}", "fraud_case", case.id,
               {"case_number": case.case_number})
    db.flush()


def txn_customer_id(db: Session, txn: Transaction) -> str:
    acct = txn.sender_account or txn.receiver_account
    return acct.user_id


def _settle_funds(db: Session, txn: Transaction) -> None:
    """Move money for an approved, previously-held transaction. No-op fields
    (deposit has no sender, withdrawal/transfer has no external receiver
    unless it's an internal-to-internal transfer)."""
    if txn.type.value in ("WITHDRAWAL", "TRANSFER") and txn.sender_account_id:
        sender: Account = db.query(Account).get(txn.sender_account_id)
        sender.balance = Decimal(sender.balance) - Decimal(txn.amount)
    if txn.type.value in ("DEPOSIT", "TRANSFER") and txn.receiver_account_id:
        receiver: Account = db.query(Account).get(txn.receiver_account_id)
        receiver.balance = Decimal(receiver.balance) + Decimal(txn.amount)
