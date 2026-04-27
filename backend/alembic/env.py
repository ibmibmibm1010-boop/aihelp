import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models import (  # noqa: F401
    AnalyticsSnapshot,
    BillingEvent,
    Board,
    BoardColumn,
    PomodoroSession,
    Subscription,
    Task,
    TaskChecklistItem,
    User,
    UserSettings,
    Workspace,
    WorkspaceMember,
)
from app.models.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_sync_url() -> str:
    url = settings.database_url
    if "+asyncpg" in url:
        return url.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
    return url


def _connect_timeout_args(url: str) -> dict:
    if "+asyncpg" in url:
        return {"timeout": settings.alembic_connect_timeout_seconds}
    if url.startswith("postgresql"):
        return {"connect_timeout": settings.alembic_connect_timeout_seconds}
    return {}


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    url = get_sync_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online_sync() -> None:
    url = get_sync_url()
    engine_kwargs: dict = {"poolclass": pool.NullPool}
    engine_kwargs["connect_args"] = _connect_timeout_args(url)
    connectable = create_engine(url, **engine_kwargs)

    with connectable.connect() as connection:
        do_run_migrations(connection)


async def run_migrations_online_async() -> None:
    url = settings.database_url
    connectable = create_async_engine(
        url,
        poolclass=pool.NullPool,
        connect_args=_connect_timeout_args(url),
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    if "+asyncpg" in settings.database_url:
        asyncio.run(run_migrations_online_async())
    else:
        run_migrations_online_sync()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
