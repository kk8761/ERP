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
    BOOTSTRAP_ADMIN_PASSWORD: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "Admin@NexaERP2026!")
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

    # MCP Integration Service Credential (SEC-20)
    MCP_API_KEY: Optional[str] = os.getenv("MCP_API_KEY", None)

    # AWS Amazon Developer Challenge 2026 Integrations (Alexa+, Fire TV, Bedrock, S3, SNS, CloudWatch)
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID", None)
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY", None)
    AWS_BEDROCK_MODEL_ID: str = os.getenv("AWS_BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "nexaerp-enterprise-documents")
    AWS_SNS_TOPIC_ARN: Optional[str] = os.getenv("AWS_SNS_TOPIC_ARN", None)
    AWS_CLOUDWATCH_LOG_GROUP: str = os.getenv("AWS_CLOUDWATCH_LOG_GROUP", "/aws/nexaerp/audit")
    ALEXA_SKILL_ID: str = os.getenv("ALEXA_SKILL_ID", "amzn1.ask.skill.nexaerp-voice-command")

    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def model_post_init(self, __context: Any) -> None:
        known_insecure = (
            "dev_super_secret",
            "nexa_erp_dev_super_secret_key",
            "nexa_erp_production_secret_key_override_2026",
            "secret",
            "changeme"
        )

        if self.ENVIRONMENT.lower() == "production":
            # SEC-25: Fail fast if session cookies are insecure in production
            if not self.COOKIE_SECURE:
                raise ValueError(
                    "[SECURITY SEC-25] Production deployment requires COOKIE_SECURE=true to prevent transmission of session cookies over unencrypted HTTP."
                )

            # SEC-03 / BUG-11: Fail fast if SECRET_KEY is missing, too short, or a known default
            if not self.SECRET_KEY or any(s in self.SECRET_KEY.lower() for s in known_insecure) or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "[SECURITY SEC-03/BUG-11] Startup blocked: A strong, non-default SECRET_KEY (minimum 32 characters) must be explicitly configured in production environment variables."
                )

            # SEC-07 / BUG-11: Fail fast if BOOTSTRAP_ADMIN_PASSWORD is empty or known default
            if not self.BOOTSTRAP_ADMIN_PASSWORD or not self.BOOTSTRAP_ADMIN_PASSWORD.strip() or self.BOOTSTRAP_ADMIN_PASSWORD == "Admin@NexaERP2026!":
                raise ValueError(
                    "[SECURITY SEC-07/BUG-11] Startup blocked: A strong, non-empty, non-default BOOTSTRAP_ADMIN_PASSWORD must be explicitly provided in production environment variables."
                )

settings = Settings()
