from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status

from app.api.deps import get_column_service, get_current_user
from app.models.user import User
from app.schemas.column import ColumnCreate, ColumnResponse
from app.services.column import ColumnService

router = APIRouter()


@router.post(
    "/boards/{board_id}/columns",
    response_model=ColumnResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создание колонки на доске",
)
async def create_column(
    board_id: uuid.UUID,
    column_in: ColumnCreate,
    current_user: User = Depends(get_current_user),
    column_service: ColumnService = Depends(get_column_service),
) -> ColumnResponse:
    column = await column_service.create_column(board_id, column_in, current_user)
    return ColumnResponse.model_validate(column)
