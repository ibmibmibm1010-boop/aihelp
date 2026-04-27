from fastapi import APIRouter

from app.api.v1 import health
from app.routers import auth as auth_router
from app.routers import boards as boards_router
from app.routers import columns as columns_router
from app.routers import users as users_router

router = APIRouter()

router.include_router(health.router)
router.include_router(
    auth_router.router,
    prefix="/auth",
    tags=["authentication"],
)
router.include_router(
    users_router.router,
    prefix="/users",
    tags=["users"],
)
router.include_router(boards_router.router, tags=["boards"])
router.include_router(columns_router.router, tags=["columns"])
