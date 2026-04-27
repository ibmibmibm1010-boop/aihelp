from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Получение информации о текущем авторизованном пользователе",
)
async def read_me(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user
