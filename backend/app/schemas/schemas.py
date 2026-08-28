"""
Pydantic request/response schemas.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------- Auth ----------

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: str
    role: str
    phone: Optional[str] = None
    created_at: datetime


# ---------- Accounts ----------

class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    account_number: str
    account_type: str
    balance: Decimal
    status: str
    created_at: datetime


# ---------- Beneficiaries ----------

class BeneficiaryCreate(BaseModel):
    beneficiary_name: str
    account_number: str
    bank_name: str
    ifsc: str


class BeneficiaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    beneficiary_name: str
    account_number: str
    bank_name: str
    ifsc: str
    created_at: datetime


# ---------- Transactions ----------

class DepositRequest(BaseModel):
    amount: Decimal = Field(gt=0)


class WithdrawRequest(BaseModel):
    amount: Decimal = Field(gt=0)


class TransferRequest(BaseModel):
    beneficiary_id: str
    amount: Decimal = Field(gt=0)


class UPIRequest(BaseModel):
    upi_id: str = Field(min_length=3, max_length=120)
    merchant: str = Field(min_length=2, max_length=150)
    amount: Decimal = Field(gt=0)


class BankCashRequest(BaseModel):
    account_number: str
    amount: Decimal = Field(gt=0)


class BankCustomerCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = None
    account_type: str = Field(default="SAVINGS", min_length=3, max_length=30)
    opening_balance: Decimal = Field(default=Decimal("0"), ge=0)


class BankCustomerCreatedOut(BaseModel):
    customer: UserOut
    account: AccountOut
    temporary_password: str


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    reference: str
    amount: Decimal
    type: str
    status: str
    risk_score: int
    risk_level: str
    fraud_probability: Decimal
    risk_reasons: Optional[Any] = None
    is_new_beneficiary: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None


# ---------- Risk ----------

class RiskProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    risk_level: str
    risk_score: int
    suspicious_transaction_count: int
    avg_transaction_amount: Decimal
    transaction_frequency: int
    updated_at: datetime


# ---------- Notifications ----------

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime


# ---------- Fraud cases / admin ----------

class FraudCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    case_number: str
    transaction_id: str
    customer_id: str
    amount: Decimal
    risk_score: int
    fraud_probability: Decimal
    risk_level: str
    detection_reasons: Optional[Any] = None
    status: str
    customer_notified: bool
    admin_notified: bool
    alert_sound_triggered: bool
    admin_decision: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class FraudDecisionRequest(BaseModel):
    decision: str  # APPROVE or BLOCK
    note: Optional[str] = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: Optional[str]
    action: str
    entity: str
    entity_id: Optional[str]
    metadata_json: Optional[Any] = None
    created_at: datetime
