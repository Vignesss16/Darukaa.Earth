from sqlalchemy.orm import Session

from app.auth import get_password_hash
from app.database import SessionLocal
from app.models import Project, User, UserRole


def seed_initial_data():
    db: Session = SessionLocal()
    try:
        # Seed default users if empty
        if db.query(User).count() == 0:
            admin_user = User(
                email="admin@darukaa.earth",
                hashed_password=get_password_hash("admin123"),
                full_name="Operations Admin",
                role=UserRole.ADMIN,
            )
            analyst_user = User(
                email="analyst@darukaa.earth",
                hashed_password=get_password_hash("analyst123"),
                full_name="Field Analyst",
                role=UserRole.ANALYST,
            )
            viewer_user = User(
                email="viewer@darukaa.earth",
                hashed_password=get_password_hash("viewer123"),
                full_name="Stakeholder Viewer",
                role=UserRole.VIEWER,
            )
            db.add_all([admin_user, analyst_user, viewer_user])
            db.commit()

        # Seed default projects if empty
        if db.query(Project).count() == 0:
            proj1 = Project(
                name="Amazon Carbon Reserve",
                description="High-density rainforest carbon sequestration and canopy monitoring zone",
            )
            proj2 = Project(
                name="Western Ghats Conservation Corridor",
                description="Biodiversity corridor and evergreen canopy preservation sector",
            )
            proj3 = Project(
                name="Kozhikode Coastal Ecosystem",
                description="Mangrove restoration and blue carbon monitoring sector",
            )
            db.add_all([proj1, proj2, proj3])
            db.commit()
    except Exception as e:
        print(f"Error seeding initial data: {e}")
        db.rollback()
    finally:
        db.close()
