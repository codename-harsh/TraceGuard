"""Pytest configuration and fixtures for TraceGuard API test suite."""
import asyncio
from collections.abc import AsyncGenerator
import os
from pathlib import Path
import sys

# Ensure apps/api and repository root are in sys.path
api_path = Path(__file__).resolve().parents[2] / "apps" / "api"
root_path = Path(__file__).resolve().parents[2]
if str(api_path) not in sys.path:
    sys.path.insert(0, str(api_path))
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.session import Base, get_db
from app.main import app

TEST_DB_FILE = Path(__file__).resolve().parent / "test_traceguard.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

TestingSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Create all tables before test session and drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    if TEST_DB_FILE.exists():
        try:
            TEST_DB_FILE.unlink()
        except Exception:
            pass


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a direct database session for test inspections."""
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client targeting the FastAPI application."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers_user_a(client: httpx.AsyncClient) -> dict[str, str]:
    """Register and authenticate user A, returning Bearer auth header."""
    email = "user_a@traceguard.test"
    password = "UserAPassword!2026"
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "User Alpha"},
    )
    if reg.status_code == 201:
        token = reg.json()["access_token"]
    else:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers_user_b(client: httpx.AsyncClient) -> dict[str, str]:
    """Register and authenticate user B, returning Bearer auth header."""
    email = "user_b@traceguard.test"
    password = "UserBPassword!2026"
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "User Beta"},
    )
    if reg.status_code == 201:
        token = reg.json()["access_token"]
    else:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
