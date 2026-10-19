import asyncio
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import engine, Base
from app.models.email_log import OutgoingEmailLog, ReceivedEmail

async def init_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created / verified successfully!")

if __name__ == "__main__":
    asyncio.run(init_tables())
