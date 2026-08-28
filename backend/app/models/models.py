"""
SQLAlchemy ORM models for BankShield AI.
Mirrors database/schema.sql exactly.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, DECIMAL, DateTime, Boolean, ForeignKey,
    Enum, Text, JSON,
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"


class AccountStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    CLOSED = "CLOSED"


class TransactionType(str, enum.Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    TRANSFER = "TRANSFER"


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    FLAGGED = "FLAGGED"
    ON_HOLD = "ON_HOLD"
    BLOCKED = "BLOCKED"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class FraudCaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    BLOCKED = "BLOCKED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class NotificationType(str, enum.Enum):
    TRANSACTION = "TRANSACTION"
    SECURITY = "SECURITY"
    FRAUD = "FRAUD"
    SYSTEM = "SYSTEM"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    full_name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    accounts = relationship("Account", back_populates="owner", cascade="all, delete-orphan")
    beneficiaries = relationship("Beneficiary", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    token = Column(String(180), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    account_number = Column(String(20), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    account_type = Column(String(30), default="SAVINGS", nullable=False)
    balance = Column(DECIMAL(18, 2), default=0, nullable=False)
    status = Column(Enum(AccountStatus), default=AccountStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="accounts")


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    beneficiary_name = Column(String(120), nullable=False)
    account_number = Column(String(20), nullable=False)
    bank_name = Column(String(120), nullable=False)
    ifsc = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="beneficiaries")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    reference = Column(String(30), unique=True, nullable=False, index=True)
    sender_account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
    receiver_account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
    beneficiary_id = Column(String(36), ForeignKey("beneficiaries.id"), nullable=True)
    amount = Column(DECIMAL(18, 2), nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False)
    risk_score = Column(Integer, default=0, nullable=False)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    fraud_probability = Column(DECIMAL(5, 2), default=0, nullable=False)
    risk_reasons = Column(JSON, nullable=True)
    is_new_beneficiary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    sender_account = relationship("Account", foreign_keys=[sender_account_id])
    receiver_account = relationship("Account", foreign_keys=[receiver_account_id])
    beneficiary = relationship("Beneficiary")
    fraud_case = relationship("FraudCase", back_populates="transaction", uselist=False)


class RiskProfile(Base):
    __tablename__ = "risk_profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    customer_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    risk_score = Column(Integer, default=0, nullable=False)
    suspicious_transaction_count = Column(Integer, default=0, nullable=False)
    avg_transaction_amount = Column(DECIMAL(18, 2), default=0, nullable=False)
    transaction_frequency = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class FraudCase(Base):
    __tablename__ = "fraud_cases"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    case_number = Column(String(30), unique=True, nullable=False, index=True)
    transaction_id = Column(String(36), ForeignKey("transactions.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    amount = Column(DECIMAL(18, 2), nullable=False)
    risk_score = Column(Integer, nullable=False)
    fraud_probability = Column(DECIMAL(5, 2), nullable=False)
    risk_level = Column(Enum(RiskLevel), nullable=False)
    detection_reasons = Column(JSON, nullable=True)
    status = Column(Enum(FraudCaseStatus), default=FraudCaseStatus.OPEN, nullable=False)
    customer_notified = Column(Boolean, default=False, nullable=False)
    admin_notified = Column(Boolean, default=False, nullable=False)
    alert_sound_triggered = Column(Boolean, default=False, nullable=False)
    admin_decision = Column(String(20), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    transaction = relationship("Transaction", back_populates="fraud_case")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(80), nullable=False)
    entity = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
