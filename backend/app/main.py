from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.db.session import async_engine, AsyncSessionLocal
from app.db.migrations import init_db
from app.db.seed import seed_canonical_dataset_if_needed
from app.api.v1 import api_v1_router

setup_logging()


import uuid


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.APP_ENV}]...")
    # Initialize DB schema
    await init_db()
    # Seed canonical demo dataset only if explicitly requested or in test environment
    if settings.SEED_DEMO_DATA_ON_STARTUP or settings.APP_ENV == "test":
        try:
            async with AsyncSessionLocal() as session:
                await seed_canonical_dataset_if_needed(session)
        except Exception as e:
            logger.warning(f"Database seeding check encountered error: {e}")
    yield
    logger.info("Shutting down InsightFlow API...")
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="InsightFlow — Intelligent Customer Feedback and Decision Platform API (Build Battle 2026)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = f"err-{uuid.uuid4().hex[:12]}"
    logger.error(
        f"[{correlation_id}] Unhandled exception on {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred. Please try again later.",
            "request_id": correlation_id,
        },
    )


@app.get("/health", tags=["Health"])
async def health_check():
    db_status = "healthy"
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check DB ping failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
        "environment": settings.APP_ENV,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/ready", tags=["Health"])
async def readiness_probe():
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"ready": False, "reason": "Database connection unavailable"},
        )


# Mount versioned API routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
