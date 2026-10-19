from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

def get_normalized_database_url(url: str) -> str:
    """
    Normalizes PostgreSQL and SQLite database URLs for Async SQLAlchemy:
    - postgres:// -> postgresql+asyncpg:// (standard cloud/Render format)
    - postgresql:// -> postgresql+asyncpg://
    - sqlite:/// -> sqlite+aiosqlite:///
    """
    if not url:
        return "sqlite+aiosqlite:///./nexaerp.db"
    
    clean_url = url.strip()
    if clean_url.startswith("postgres://"):
        return clean_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if clean_url.startswith("postgresql://") and not clean_url.startswith("postgresql+"):
        return clean_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if clean_url.startswith("sqlite://") and not clean_url.startswith("sqlite+"):
        return clean_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    return clean_url

normalized_db_url = get_normalized_database_url(settings.DATABASE_URL)

# Engine configuration & Connection Pooling
connect_args = {}
engine_kwargs = {
    "echo": False,
    "future": True
}

if "sqlite" in normalized_db_url:
    connect_args["check_same_thread"] = False
else:
    # Enterprise PostgreSQL Pool for Cloud & Production (Render / Neon / Supabase)
    engine_kwargs.update({
        "pool_pre_ping": True,     # Recovers from closed idle connections automatically
        "pool_recycle": 300,       # Recycles connections every 5 minutes to prevent stale sockets
        "pool_size": 10,
        "max_overflow": 20
    })

engine = create_async_engine(
    normalized_db_url,
    connect_args=connect_args,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
