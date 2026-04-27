from __future__ import annotations

import uuid

from fastapi import HTTPException
from passlib.context import CryptContext

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import SignInRequest, SignUpRequest, TokenResponse
from app.schemas.user import UserCreate

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_LOGIN_FAILED = "Неверный email или пароль"
_REFRESH_FAILED = "Недействительный или просроченный refresh-токен"


def hash_password(plain_password: str) -> str:
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def register_user(self, data: SignUpRequest) -> User:
        email = str(data.email).lower()
        existing = await self._user_repo.get_by_email(email)
        if existing is not None:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с таким email уже зарегистрирован",
            )
        password_hash = hash_password(data.password)
        create_in = UserCreate(
            email=email,
            username=data.username,
            password_hash=password_hash,
            full_name=data.full_name,
        )
        return await self._user_repo.create(create_in)

    async def login(self, data: SignInRequest) -> TokenResponse:
        email = str(data.email).lower()
        user = await self._user_repo.get_by_email(email)
        if user is None or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail=_LOGIN_FAILED)
        sub = str(user.id)
        return TokenResponse(
            access_token=create_access_token({"sub": sub}),
            refresh_token=create_refresh_token({"sub": sub}),
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
        except ValueError:
            raise HTTPException(status_code=401, detail=_REFRESH_FAILED) from None
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail=_REFRESH_FAILED)
        try:
            user_id = uuid.UUID(str(sub))
        except ValueError:
            raise HTTPException(status_code=401, detail=_REFRESH_FAILED) from None
        user = await self._user_repo.get_by_id(user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail=_REFRESH_FAILED)
        sub_str = str(user.id)
        return TokenResponse(
            access_token=create_access_token({"sub": sub_str}),
            refresh_token=create_refresh_token({"sub": sub_str}),
        )
