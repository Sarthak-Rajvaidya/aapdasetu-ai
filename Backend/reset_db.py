"""
Local development helper: drops and recreates all tables, then reseeds the
catalog data (courses/quizzes/simulations/achievements). Since the schema
changed significantly from the original DTMS project (plain-text passwords
-> password_hash, new tables), any existing dtms.db from before this
upgrade is NOT compatible and must be reset via this script (or deleted)
before first run.

Usage:
    cd Backend
    python reset_db.py
"""
from app.db.database import Base, engine, SessionLocal
from app.models import models  # noqa: F401
from app.seed import seed_all

if __name__ == "__main__":
    confirm = input(
        "This will DROP ALL TABLES in the configured database and reseed "
        "catalog data. User accounts and history will be lost. Type 'yes' to continue: "
    )
    if confirm.strip().lower() != "yes":
        print("Aborted.")
        raise SystemExit(0)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        seed_all(db)

    print("Database reset and reseeded successfully.")
