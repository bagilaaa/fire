import os
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from app.models import Base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://tickets:tickets@db:5432/tickets_db",
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)