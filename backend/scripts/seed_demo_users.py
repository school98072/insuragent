import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.security import hash_password

def seed_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    users_to_seed = [
        {
            "email": "admin@kaggle.com",
            "full_name": "System Admin",
            "password": "AdminPassword123",
            "role": UserRole.ROLE_ADMIN,
        },
        {
            "email": "adjuster@kaggle.com",
            "full_name": "Loss Adjuster",
            "password": "AdjusterPassword123",
            "role": UserRole.ROLE_ADJUSTER,
        },
        {
            "email": "broker@kaggle.com",
            "full_name": "Broker Desk",
            "password": "BrokerPassword123",
            "role": UserRole.ROLE_BROKER,
        }
    ]

    for u in users_to_seed:
        existing_user = db.query(User).filter(User.email == u["email"]).first()
        if not existing_user:
            new_user = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                is_active=True,
                is_verified=True
            )
            db.add(new_user)
            print(f"Created user: {u['email']}")
        else:
            print(f"User already exists: {u['email']}")
            
    db.commit()
    db.close()
    print("Database seeding completed.")

if __name__ == "__main__":
    seed_users()
