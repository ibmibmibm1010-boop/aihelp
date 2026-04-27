from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import get_auth_service
from app.models.user import User
from app.schemas.auth import (
    RefreshTokenRequest,
    SignInRequest,
    SignUpRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.auth import AuthService

router = APIRouter()


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    summary="Регистрация нового пользователя",
)
async def signup(
    data: SignUpRequest,
    service: AuthService = Depends(get_auth_service),
) -> User:
    return await service.register_user(data)


@router.post(
    "/signin",
    response_model=TokenResponse,
    summary="Аутентификация пользователя и получение токенов",
)
async def signin(
    data: SignInRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await service.login(data)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Обновление пары токенов по refresh-токену",
)
async def refresh(
    data: RefreshTokenRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await service.refresh_tokens(data.refresh_token)
