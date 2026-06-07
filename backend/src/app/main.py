"""FastAPI application initialization and lifecycle configuration.
"""

from __future__ import annotations

import logging
import logging.handlers
import os
from contextlib import asynccontextmanager
from typing import Any

import logfire
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.app.config import get_settings
from src.app.dependencies import get_redis_client

# Feature routers
from src.auth.router import router as auth_router
from src.domain.exceptions import DomainError
from src.infrastructure.database import get_engine
from src.products.router import router as products_router
from src.reports.router import router as reports_router
from src.settings.router import router as settings_router
from src.validation.router import router as validation_router

# Configure logger with both console and rotating file output
_LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
os.makedirs(_LOG_DIR, exist_ok=True)
_LOG_FILE = os.path.join(_LOG_DIR, "app.log")

_log_formatter = logging.Formatter(
    "%(asctime)s %(levelname)-8s %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
_file_handler = logging.handlers.RotatingFileHandler(
    _LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
)
_file_handler.setFormatter(_log_formatter)
_console_handler = logging.StreamHandler()
_console_handler.setFormatter(_log_formatter)

logging.basicConfig(level=logging.INFO, handlers=[_console_handler, _file_handler])
logger = logging.getLogger(__name__)

# Configure Logfire observability (does not send to cloud without token, logs locally)
settings = get_settings()
logfire.configure(
    service_name=settings.app_name,
    service_version=settings.app_version,
    send_to_logfire=False,  # Set to True in production with logfire write token
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    """Lifespan context manager handling application startup and shutdown."""
    logger.info("Starting up Flipkart Product Verification System backend...")

    # Instrument database connection pool
    engine = get_engine()
    logfire.instrument_sqlalchemy(engine)

    # Initialize storage folders if they do not exist
    import os
    os.makedirs(f"{settings.file_storage_path}/uploads", exist_ok=True)
    os.makedirs(f"{settings.file_storage_path}/images", exist_ok=True)

    # Seed default admin user if no users exist
    from sqlalchemy import select

    from src.auth.models import User
    from src.auth.service import pwd_context
    from src.infrastructure.database import get_session_factory

    session_factory = get_session_factory()
    try:
        async with session_factory() as session:
            result = await session.execute(select(User).limit(1))
            first_user = result.scalar_one_or_none()
            if not first_user:
                logger.info("No users found in database. Seeding default admin account...")
                hashed_pw = pwd_context.hash("adminpassword")
                admin_user = User(
                    username="admin",
                    hashed_password=hashed_pw,
                    role="admin",
                    is_active=True,
                )
                session.add(admin_user)
                await session.commit()
                logger.info("Default admin user created successfully! Username: admin, Password: adminpassword")
    except Exception as e:
        logger.warning(
            "Failed to auto-seed default admin user: %s (This is normal if database migrations 'alembic upgrade head' have not been run yet.)",
            e
        )

    # Mark stale ingestion jobs as failed due to server restart/shutdown
    try:
        from sqlalchemy import update

        from src.products.ingestion_models import IngestionJob
        from src.shared.datetime_utils import utc_now

        async with session_factory() as session:
            stmt = (
                update(IngestionJob)
                .where(IngestionJob.status.in_(["pending", "processing"]))
                .values(
                    status="failed",
                    completed_at=utc_now(),
                    error_details=[{"row": 0, "field": "fatal", "msg": "Job interrupted due to server restart/shutdown"}]
                )
            )
            res = await session.execute(stmt)
            await session.commit()
            if res.rowcount > 0:
                logger.info("Marked %d stale ingestion jobs as failed on startup.", res.rowcount)
    except Exception as e:
        logger.warning("Failed to clean up stale ingestion jobs on startup: %s", e)

    yield

    logger.info("Shutting down backend, releasing connection pools...")

    # Close Redis client connections
    try:
        redis = get_redis_client(settings)
        await redis.close()
    except Exception as e:
        logger.warning("Error closing Redis client: %s", e)

    # Close SQLAlchemy engine pools
    try:
        await engine.dispose()
    except Exception as e:
        logger.warning("Error disposing database engine: %s", e)


def create_app() -> FastAPI:
    """App factory building and configuring the FastAPI instance."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    # Instrument FastAPI requests
    logfire.instrument_fastapi(app)

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/storage", StaticFiles(directory=settings.file_storage_path), name="storage")

    # Health check endpoint
    @app.get("/health", tags=["Health"], summary="Health check endpoint.")
    async def health_check() -> dict:
        return {
            "status": "healthy",
            "version": settings.app_version,
            "timestamp": utc_now().isoformat(),
        }

    # ── Exception Handlers ────────────────────────────────────────────────
    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        """Handle custom business exceptions raised within domain/service layer."""
        logger.warning("Domain error on %s: %s (code=%s)", request.url.path, exc.message, exc.code)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "detail": exc.message,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """Override Pydantic/FastAPI validation exceptions to prevent internal leaks."""
        logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
        formatted_errors = [
            {
                "field": ".".join(str(loc) for loc in err["loc"][1:]),
                "msg": err["msg"],
                "type": err["type"],
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "code": "validation_error",
                "detail": formatted_errors,
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Handle default routing/HTTP errors (e.g. 404 Not Found, 405 Method Not Allowed)."""
        logger.warning("HTTP error on %s: %s (code=%d)", request.url.path, exc.detail, exc.status_code)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": f"http_{exc.status_code}",
                "detail": exc.detail,
            },
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all handler to prevent stack traces leaking to client responses."""
        logger.exception("Unhandled server exception on %s", request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "code": "internal_server_error",
                "detail": "An unexpected server error occurred. Please contact system support.",
            },
        )

    # ── Mounting Routers ──────────────────────────────────────────────────
    app.include_router(auth_router, prefix="/api")
    app.include_router(products_router, prefix="/api")
    app.include_router(validation_router, prefix="/api")
    app.include_router(reports_router, prefix="/api")
    app.include_router(settings_router, prefix="/api")

    return app


# Import utc_now for health check timestamp
from src.shared.datetime_utils import utc_now

# Global app instance for ASGI servers (like uvicorn)
app = create_app()
