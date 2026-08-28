"""
Beneficiary management routes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Beneficiary
from app.schemas.schemas import BeneficiaryCreate, BeneficiaryOut
from app.services.security import get_current_user
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/beneficiaries", tags=["Beneficiaries"])


@router.post("", response_model=BeneficiaryOut)
def add_beneficiary(payload: BeneficiaryCreate, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    if not payload.account_number or not payload.ifsc:
        raise HTTPException(status_code=400, detail="Invalid beneficiary details")

    beneficiary = Beneficiary(
        customer_id=user.id,
        beneficiary_name=payload.beneficiary_name,
        account_number=payload.account_number,
        bank_name=payload.bank_name,
        ifsc=payload.ifsc,
    )
    db.add(beneficiary)
    db.flush()
    log_action(db, user.id, "BENEFICIARY_ADDED", "beneficiary", beneficiary.id,
               {"account_number": beneficiary.account_number})
    db.commit()
    db.refresh(beneficiary)
    return beneficiary


@router.get("", response_model=list[BeneficiaryOut])
def list_beneficiaries(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Beneficiary).filter(Beneficiary.customer_id == user.id).all()


@router.delete("/{beneficiary_id}")
def delete_beneficiary(beneficiary_id: str, db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)):
    beneficiary = db.query(Beneficiary).filter(
        Beneficiary.id == beneficiary_id, Beneficiary.customer_id == user.id
    ).first()
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    db.delete(beneficiary)
    log_action(db, user.id, "BENEFICIARY_DELETED", "beneficiary", beneficiary_id, {})
    db.commit()
    return {"detail": "Beneficiary deleted"}
