"""
Transaction routes: deposit, withdraw, transfer, list, detail.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Account, Beneficiary, Transaction
from app.schemas.schemas import DepositRequest, WithdrawRequest, TransferRequest, UPIRequest, TransactionOut
from app.services.security import get_current_user
from app.services import transaction_service

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


def _primary_account(db: Session, user: User) -> Account:
    account = db.query(Account).filter(Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="No account found for this user")
    if account.status.value != "ACTIVE":
        raise HTTPException(status_code=400, detail=f"Account is {account.status.value}, cannot transact")
    return account


@router.post("/deposit", response_model=TransactionOut)
async def deposit(payload: DepositRequest, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    account = _primary_account(db, user)
    return await transaction_service.process_deposit(db, account, payload.amount)


@router.post("/withdraw", response_model=TransactionOut)
async def withdraw(payload: WithdrawRequest, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    account = _primary_account(db, user)
    return await transaction_service.process_withdrawal(db, account, payload.amount)


@router.post("/upi", response_model=TransactionOut)
async def upi_payment(payload: UPIRequest, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    account = _primary_account(db, user)
    return await transaction_service.process_upi_payment(db, account, payload.amount, payload.upi_id, payload.merchant, user)


@router.post("/transfer", response_model=TransactionOut)
async def transfer(payload: TransferRequest, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    account = _primary_account(db, user)
    beneficiary = db.query(Beneficiary).filter(
        Beneficiary.id == payload.beneficiary_id, Beneficiary.customer_id == user.id
    ).first()
    if not beneficiary:
        raise HTTPException(status_code=400, detail="Invalid beneficiary")
    return await transaction_service.process_transfer(db, account, beneficiary, payload.amount, user)


@router.get("", response_model=list[TransactionOut])
def list_transactions(db: Session = Depends(get_db), user: User = Depends(get_current_user),
                       limit: int = Query(50, le=200), offset: int = 0):
    account_ids = [a.id for a in db.query(Account).filter(Account.user_id == user.id).all()]
    txns = (
        db.query(Transaction)
        .filter(or_(Transaction.sender_account_id.in_(account_ids),
                     Transaction.receiver_account_id.in_(account_ids)))
        .order_by(Transaction.created_at.desc())
        .offset(offset).limit(limit)
        .all()
    )
    return txns


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: str, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    account_ids = {a.id for a in db.query(Account).filter(Account.user_id == user.id).all()}
    if user.role.value != "ADMIN" and txn.sender_account_id not in account_ids and txn.receiver_account_id not in account_ids:
        raise HTTPException(status_code=403, detail="Not authorized to view this transaction")
    return txn
