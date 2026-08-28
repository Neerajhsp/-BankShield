"""
Customer risk profile route.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, RiskProfile
from app.schemas.schemas import RiskProfileOut
from app.services.security import get_current_user

router = APIRouter(prefix="/api/risk", tags=["Risk"])


@router.get("/profile", response_model=RiskProfileOut)
def get_risk_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = db.query(RiskProfile).filter(RiskProfile.customer_id == user.id).first()
    if not profile:
        profile = RiskProfile(customer_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile
