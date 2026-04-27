from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.repositories.board import BoardRepository
from app.repositories.column import ColumnRepository
from app.repositories.task import TaskRepository
from app.repositories.user import UserRepository
from app.repositories.workspace import WorkspaceRepository
from app.services.auth import AuthService
from app.services.board import BoardService
from app.services.column import ColumnService
from app.services.task import TaskService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/signin",
    auto_error=False,
)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Не удалось подтвердить учётные данные",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_auth_service(
    session: AsyncSession = Depends(get_db),
) -> AuthService:
    return AuthService(UserRepository(session))


async def get_board_service(
    session: AsyncSession = Depends(get_db),
) -> BoardService:
    return BoardService(
        BoardRepository(session),
        WorkspaceRepository(session),
    )


async def get_column_service(
    session: AsyncSession = Depends(get_db),
) -> ColumnService:
    return ColumnService(
        BoardRepository(session),
        ColumnRepository(session),
        WorkspaceRepository(session),
    )


async def get_task_service(
    session: AsyncSession = Depends(get_db),
) -> TaskService:
    return TaskService(
        BoardRepository(session),
        ColumnRepository(session),
        TaskRepository(session),
        WorkspaceRepository(session),
        UserRepository(session),
    )


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    if not token:
        raise _CREDENTIALS_EXCEPTION
    try:
        payload = decode_token(token)
    except ValueError:
        raise _CREDENTIALS_EXCEPTION from None
    if payload.get("typ") != "access":
        raise _CREDENTIALS_EXCEPTION
    sub = payload.get("sub")
    if not sub:
        raise _CREDENTIALS_EXCEPTION
    try:
        user_id = uuid.UUID(str(sub))
    except ValueError:
        raise _CREDENTIALS_EXCEPTION from None
    user = await UserRepository(session).get_by_id(user_id)
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXCEPTION
    return user
