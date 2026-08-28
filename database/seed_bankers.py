"""Create local BankShield banker/cashier demo accounts.

Set BANKER_1_EMAIL ... BANKER_4_EMAIL in .env to replace these addresses.
Passwords are deliberately local-demo credentials; change them before any
real deployment.
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.database import SessionLocal, Base, engine
from app.models.models import User, UserRole
from app.services.security import hash_password

bankers = [
    (os.getenv("BANKER_1_EMAIL", "banker1@bankshield.ai"), "Neeraj Banker"),
    (os.getenv("BANKER_2_EMAIL", "banker2@bankshield.ai"), "Aarav Banker"),
    (os.getenv("BANKER_3_EMAIL", "banker3@bankshield.ai"), "Riya Banker"),
    (os.getenv("BANKER_4_EMAIL", "banker4@bankshield.ai"), "Karan Banker"),
]


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for email, name in bankers:
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.full_name = name
                user.role = UserRole.ADMIN
                user.is_active = True
            else:
                user = User(full_name=name, email=email, password_hash=hash_password("Neeraj@123"), role=UserRole.ADMIN)
                db.add(user)
        db.commit()
        print("Banker accounts ready:")
        for email, _ in bankers:
            print(f"  {email} / Neeraj@123")
    finally:
        db.close()

if __name__ == "__main__":
    main()
