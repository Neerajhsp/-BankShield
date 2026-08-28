"""
Account + profile routes for the logged-in customer.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Account
from app.schemas.schemas import UserOut, AccountOut
from app.services.security import get_current_user

router = APIRouter(prefix="/api", tags=["Accounts"])


@router.get("/customers/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Account).filter(Account.user_id == user.id).all()


@router.get("/accounts/{account_id}", response_model=AccountOut)
def get_account(account_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.user_id != user.id and user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to view this account")
    return account
