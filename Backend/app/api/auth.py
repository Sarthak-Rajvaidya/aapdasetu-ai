from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token, get_current_user, hash_password, verify_password,
)
from app.db.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.user_id == payload.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This user ID is already taken")

    if payload.email:
        existing_email = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="This email is already registered")

    user = models.User(
        user_id=payload.user_id,
        name=payload.name,
        email=payload.email,
        age=payload.age,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Accepts standard OAuth2 password-flow form fields (username, password) so
    it also works with FastAPI's interactive docs / Swagger "Authorize" button.
    `username` here is the platform's `user_id`.
    """
    user = db.query(models.User).filter(models.User.user_id == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token = create_access_token(subject=user.user_id)
    return schemas.TokenResponse(access_token=token)


@router.post("/login-json", response_model=schemas.TokenResponse)
def login_json(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """JSON-body login, convenient for the frontend fetch() calls."""
    user = db.query(models.User).filter(models.User.user_id == payload.user_id.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token = create_access_token(subject=user.user_id)
    return schemas.TokenResponse(access_token=token)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.age is not None:
        current_user.age = payload.age
    if payload.profile_image is not None:
        current_user.profile_image = payload.profile_image
    db.commit()
    db.refresh(current_user)
    return current_user
