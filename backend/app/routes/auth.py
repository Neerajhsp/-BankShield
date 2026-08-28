"""Authentication, registration and password reset routes."""
import random
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import User, Account, UserRole, PasswordResetToken
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.services.security import hash_password, verify_password, create_access_token
from app.services.audit_service import log_action
from app.services.notification_channels import send_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _generate_account_number() -> str:
    return "BSA" + "".join(random.choices("0123456789", k=10))


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = User(full_name=payload.full_name, email=payload.email,
                password_hash=hash_password(payload.password), role=UserRole.CUSTOMER,
                phone=payload.phone)
    db.add(user); db.flush()
    db.add(Account(account_number=_generate_account_number(), user_id=user.id,
                   account_type="SAVINGS", balance=0))
    log_action(db, user.id, "REGISTER", "user", user.id, {"email": user.email})
    db.commit(); db.refresh(user)
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, user_id=user.id, full_name=user.full_name)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    log_action(db, user.id, "LOGIN", "user", user.id, {})
    db.commit()
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, user_id=user.id, full_name=user.full_name)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Always return the same response so email existence is not disclosed.
    user = db.query(User).filter(User.email == payload.email).first()
    if user and user.is_active:
        token = secrets.token_urlsafe(42)
        db.add(PasswordResetToken(user_id=user.id, token=token,
                                  expires_at=datetime.utcnow() + timedelta(minutes=30)))
        db.commit()
        link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_email(user.email, "BankShield AI password reset",
                   f"Hello {user.full_name},\\n\\nReset your password using this link (valid for 30 minutes):\\n{link}\\n\\nIf you did not request this, ignore this email.")
    return {"detail": "If an account exists for that email, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token,
        PasswordResetToken.used == False,  # noqa: E712
        PasswordResetToken.expires_at > datetime.utcnow(),
    ).first()
    if not reset:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")
    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Reset link is invalid")
    user.password_hash = hash_password(payload.new_password)
    reset.used = True
    db.commit()
    return {"detail": "Password updated successfully. You can now sign in."}
