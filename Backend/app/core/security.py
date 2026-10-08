"""
Security primitives for AapdaSetu AI.

- Passwords are hashed with bcrypt (via passlib). Plain-text passwords are
  never stored or compared.
- JWTs identify the user. Protected routes derive the current user from the
  token via `get_current_user` — the frontend-supplied user_id is NEVER
  trusted for who-am-I decisions.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except Exception:
        return False


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


class AuthError(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


def decode_token(token: str) -> str:
    """Returns the username/user_id encoded in the token's `sub` claim."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise AuthError()
    user_id = payload.get("sub")
    if not user_id:
        raise AuthError()
    return user_id


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Resolves the authenticated user from the JWT bearer token.
    This is the ONLY source of truth for "who is calling" on protected
    routes — request bodies may NOT override it.
    """
    user_id = decode_token(token)
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if user is None or not user.is_active:
        raise AuthError("User not found or inactive")
    return user


def get_current_user_optional(
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)),
    db: Session = Depends(get_db),
):
    if not token:
        return None
    try:
        user_id = decode_token(token)
    except HTTPException:
        return None
    return db.query(models.User).filter(models.User.user_id == user_id).first()


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
