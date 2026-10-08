"""
AapdaSetu AI — Backend entry point.

Run locally:
    cd Backend
    uvicorn app.main:app --reload

Run in production (e.g. Render):
    uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import Base, engine, SessionLocal
from app.models import models  # noqa: F401  (ensures models are registered on Base)
from app.seed import seed_all

from app.api import auth, courses, quizzes, simulations, ai, predictor, dashboard, achievements, admin

# ---------------------------------------------------------------------------
# Database: create tables + idempotent seed data
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

with SessionLocal() as _db:
    seed_all(_db)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description=f"{settings.APP_NAME} — {settings.APP_TAGLINE}",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(quizzes.router)
app.include_router(simulations.router)
app.include_router(ai.router)
app.include_router(predictor.router)
app.include_router(dashboard.router)
app.include_router(achievements.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "tagline": settings.APP_TAGLINE}


# ---------------------------------------------------------------------------
# Frontend hosting (mounted last so /api/* routes above take priority)
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # project root
FRONTEND_DIR = BASE_DIR / "Frontend"

if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
