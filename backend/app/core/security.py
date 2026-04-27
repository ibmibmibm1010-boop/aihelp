from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings


def _encode_sub_exp(sub: str, expire: datetime, typ: str) -> str:
    to_encode: dict[str, Any] = {
        "sub": sub,
        "exp": int(expire.timestamp()),
        "typ": typ,
    }
    secret = settings.secret_key.get_secret_value()
    return jwt.encode(to_encode, secret, algorithm=settings.jwt_algorithm)


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    if "sub" not in data:
        raise ValueError("Token payload must include 'sub'")

    sub = str(data["sub"])
    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes,
        )
    return _encode_sub_exp(sub, expire, "access")


def create_refresh_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Выдаёт JWT refresh с `sub`, `exp` и `typ="refresh"`.

    Отзыв токенов (ротация, blacklist по jti или версии пользователя в БД)
    реализуется в сервисном слое при валидации, не в payload этого метода.
    """
    if "sub" not in data:
        raise ValueError("Token payload must include 'sub'")

    sub = str(data["sub"])
    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.refresh_token_expire_days,
        )
    return _encode_sub_exp(sub, expire, "refresh")


def decode_token(token: str) -> dict[str, Any]:
    """Декодирует и проверяет подпись и `exp` JWT (access или refresh)."""
    try:
        return jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise ValueError("Недействительный или просроченный токен") from exc
