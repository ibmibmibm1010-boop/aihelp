from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "VibeBoard"
    debug: bool = False

    database_url: str
    secret_key: SecretStr
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    stripe_public_key: str = ""
    stripe_secret_key: SecretStr = SecretStr("")

    alembic_connect_timeout_seconds: int = 10


settings = Settings()
