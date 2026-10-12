import os
import sys
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

TEST_DB_PATH = os.path.join(backend_dir, "test_insightflow.db")
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = TEST_DB_URL

from app.main import app
from app.db.base import Base
import app.db.session as session_module
from app.api.deps import get_session

# Create shared engine for testing
test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Override the global session module so background tasks use test_engine
session_module.async_engine = test_engine
session_module.AsyncSessionLocal = TestSessionLocal


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()

    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass


from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    limiter.reset()
    yield
    limiter.reset()


@pytest_asyncio.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def sample_csv_content() -> bytes:
    return (
        "review,category\n"
        "The packaging was damaged upon arrival,Operational Issues\n"
        "The packaging was damaged upon arrival,Operational Issues\n"
        "I encountered a scam where seller asked for extra money,Fraud and Scam\n"
        "The features of this product are innovative and useful,Product Feedback\n"
        "Customer support was completely unresponsive,Customer Service\n"
    ).encode("utf-8")
