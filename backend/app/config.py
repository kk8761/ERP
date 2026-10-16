import os
from typing import List, Any
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "NexaERP"
    DEBUG: bool = True
    PORT: int = 8000
    FRONTEND_PORT: int = 5173

    # Security
    SECRET_KEY: str = "nexa_erp_dev_super_secret_key_987654321_token_safe"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    SESSION_COOKIE_NAME: str = "nexaerp_session"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./nexaerp.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Rate Limiting
    RATE_LIMIT_LOGIN_ATTEMPTS: int = 10
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Initial Admin Bootstrap
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@nexaerp.internal"
    BOOTSTRAP_ADMIN_NAME: str = "Karthik Reddy"
    BOOTSTRAP_ADMIN_PASSWORD: str = "Admin@NexaERP2026!"
    BOOTSTRAP_ADMIN_BRANCH: str = "Main Store"
    BOOTSTRAP_ADMIN_ORG: str = "Nexa Global Enterprises"

    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def model_post_init(self, __context: Any) -> None:
        if self.ENVIRONMENT.lower() == "production" and "dev_super_secret" in self.SECRET_KEY:
            import secrets
            # Generate cryptographic 256-bit entropy key to prevent insecure default in production
            self.SECRET_KEY = secrets.token_hex(32)

settings = Settings()
