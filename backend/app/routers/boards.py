from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status

from app.api.deps import get_board_service, get_current_user
from app.models.user import User
from app.schemas.board import BoardCreate, BoardResponse
from app.services.board import BoardService

router = APIRouter()


@router.post(
    "/boards",
    response_model=BoardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создание новой доски в рабочем пространстве",
)
async def create_board(
    board_in: BoardCreate,
    current_user: User = Depends(get_current_user),
    board_service: BoardService = Depends(get_board_service),
) -> BoardResponse:
    board = await board_service.create_board(board_in, current_user)
    return BoardResponse.model_validate(board)


@router.get(
    "/workspaces/{workspace_id}/boards",
    response_model=list[BoardResponse],
    summary="Список досок рабочего пространства",
)
async def list_workspace_boards(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    board_service: BoardService = Depends(get_board_service),
) -> list[BoardResponse]:
    boards = await board_service.list_boards(workspace_id, current_user)
    return [BoardResponse.model_validate(b) for b in boards]
