from fastapi import APIRouter

# Агрегатор всех доменных роутеров.
# Пример подключения в будущем:
#   from app.routers import boards, tasks, users
#   router.include_router(boards.router, prefix="/boards")

router = APIRouter()
