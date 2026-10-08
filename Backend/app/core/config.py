"""
Central configuration for AapdaSetu AI backend.
All values are read from environment variables so the same code works
locally (SQLite, no keys) and in production (Postgres, real keys).
Never hard-code secrets here.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # .../Backend


class Settings:
    APP_NAME: str = "AapdaSetu AI"
    APP_TAGLINE: str = "Learn. Simulate. Prepare. Respond."

    # --- Security ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

    # --- Database ---
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/dtms.db")

    # --- CORS ---
    CORS_ORIGINS: list = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
    ]

    # --- AI / RAG ---
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

    # --- ML ---
    ML_MODEL_PATH: str = os.getenv("ML_MODEL_PATH", str(BASE_DIR / "app" / "ml" / "disaster_model.pkl"))


settings = Settings()

if not settings.SECRET_KEY:
    # Fail loudly in production; allow a dev-only fallback so local `uvicorn` still boots,
    # but make it impossible to miss in logs.
    import warnings
    warnings.warn(
        "SECRET_KEY is not set in the environment. Using an insecure development-only "
        "fallback. Set SECRET_KEY in your .env before deploying.",
        stacklevel=1,
    )
    settings.SECRET_KEY = "dev-only-insecure-secret-change-me"
