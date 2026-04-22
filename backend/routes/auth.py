import os
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database import get_db
from models import User

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-please")
ALGORITHM  = "HS256"
TOKEN_DAYS = 7


class RegisterBody(BaseModel):
    email:    str
    password: str
    name:     str = ""


class LoginBody(BaseModel):
    email:    str
    password: str


class UserOut(BaseModel):
    id:         int
    email:      str
    name:       str | None
    created_at: datetime

    class Config:
        from_attributes = True


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: DBSession = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/auth/register")
def register(body: RegisterBody, db: DBSession = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=body.email, hashed_password=_hash(body.password), name=body.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = _create_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@router.post("/auth/login")
def login(body: LoginBody, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not _verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = _create_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@router.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
