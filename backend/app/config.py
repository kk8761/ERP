import os
from typing import List, Any, Optional
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
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")

    # Database (PostgreSQL / SQLite)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./nexaerp.db")

    # Document Database (MongoDB)
    MONGODB_URI: Optional[str] = os.getenv("MONGODB_URI", None)
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "nexaerp")

    # CORS — explicit trusted origins only (never use "*" in production)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    # Rate Limiting
    RATE_LIMIT_LOGIN_ATTEMPTS: int = 10
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Initial Admin Bootstrap — read from environment variables (NEVER hardcode in production)
    BOOTSTRAP_ADMIN_EMAIL: str = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@nexaerp.internal")
    BOOTSTRAP_ADMIN_NAME: str = os.getenv("BOOTSTRAP_ADMIN_NAME", "System Administrator")
    BOOTSTRAP_ADMIN_PASSWORD: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "ChangeMe@FirstLogin!")
    BOOTSTRAP_ADMIN_BRANCH: str = os.getenv("BOOTSTRAP_ADMIN_BRANCH", "Main Store")
    BOOTSTRAP_ADMIN_ORG: str = os.getenv("BOOTSTRAP_ADMIN_ORG", "Nexa Global Enterprises")

    # AI Multi-Provider APIs (Groq, Gemini, OpenAI)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Enterprise SMTP & Mail Dispatch (RFC 5322 Compliant)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    SMTP_FROM_EMAIL: str = "procurement@nexaerp.internal"
    SMTP_FROM_NAME: str = "NexaERP Enterprise Mailer"

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
