"""ProductService handles querying products, caching lookups, and running bulk CSV imports.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import timedelta
from time import monotonic
from typing import Any

from src.domain.exceptions import ProductNotFoundError
from src.domain.interfaces.cache import ICacheProvider
from src.domain.interfaces.repositories import (
    IIngestionJobRepository,
    IProductRepository,
)
from src.domain.interfaces.storage import IFileStorage
from src.infrastructure.bulk_loader import PostgresBulkLoader
from src.products.schemas import (
    IngestionJobResponse,
    IngestionStatusResponse,
    ProductResponse,
)
from src.shared.datetime_utils import ensure_utc, utc_now
from src.shared.pagination import PaginatedResponse, PaginationParams, paginate

logger = logging.getLogger(__name__)

_ANALYZE_MIN_INSERTED_ROWS = 1
_PROGRESS_UPDATE_INTERVAL_SECONDS = 2.0
_PROGRESS_UPDATE_MIN_ROWS = 100_000


class ProductService:
    """Business logic for inventory references and upload pipelines."""

    def __init__(
        self,
        product_repository: IProductRepository,
        file_storage: IFileStorage,
        cache_provider: ICacheProvider,
        ingestion_repository: IIngestionJobRepository,
        bulk_loader: PostgresBulkLoader,
    ) -> None:
        self._repo = product_repository
        self._storage = file_storage
        self._cache = cache_provider
        self._ingestion_repo = ingestion_repository
        self._loader = bulk_loader

    # ── product lookup ────────────────────────────────────────────────

    async def get_product(self, wid: str) -> ProductResponse:
        """Fetch a product by WID. Uses cache-aside pattern with Redis.

        Args:
            wid: Unique warehouse identifier.

        Returns:
            The Product details.

        Raises:
            ProductNotFoundError: If product doesn't exist in DB.
        """
        cache_key = f"product:{wid}"
        try:
            cached = await self._cache.get(cache_key)
            if cached:
                logger.debug("Cache hit for key '%s'", cache_key)
                if cached == "NOT_FOUND":
                    raise ProductNotFoundError(wid)
                data = json.loads(cached)
                return ProductResponse(**data)
        except ProductNotFoundError:
            raise
        except Exception as e:
            logger.warning("Cache retrieval failed for key '%s': %s", cache_key, e)

        # Fallback to database
        product = await self._repo.get_by_wid(wid)
        if not product:
            # Cache the negative result for 5 minutes to prevent cache penetration / DB exhaustion
            try:
                await self._cache.set(cache_key, "NOT_FOUND", ttl_seconds=300)
            except Exception as e:
                logger.warning("Failed to cache negative lookup for key '%s': %s", cache_key, e)
            raise ProductNotFoundError(wid)

        response = ProductResponse.model_validate(product)

        # Write back to cache asynchronously
        try:
            # Serialise dates as ISO format
            payload = json.dumps({
                "wid": response.wid,
                "ean": response.ean,
                "manufacturing_date": response.manufacturing_date.isoformat(),
                "expiry_date": response.expiry_date.isoformat(),
            })
            await self._cache.set(cache_key, payload, ttl_seconds=3600)  # Cache for 1 hour
        except Exception as e:
            logger.warning("Cache write failed for key '%s': %s", cache_key, e)

        return response

    # ── CSV upload ────────────────────────────────────────────────────

    async def upload_csv(
        self,
        file_content: bytes,
        filename: str,
        created_by: str | None = None,
    ) -> uuid.UUID:
        """Save upload file and create an IngestionJob tracking record.

        Args:
            file_content: Raw bytes of the CSV file.
            filename: Upload filename.
            created_by: Identifier of user performing the upload.

        Returns:
            UUID of the created ingestion job.
        """
        # Save CSV to local storage (sanitizes filename to UUID format)
        saved_path = await self._storage.save_upload(file_content, filename)
        abs_path = str(self._storage.get_file_path(saved_path))

        record = {
            "filename": filename,
            "file_path": abs_path,
            "status": "pending",
            "created_by": created_by,
        }
        job = await self._ingestion_repo.create(record)
        return job.id

    async def upload_csv_stream(
        self,
        upload_file: object,
        filename: str,
        created_by: str | None = None,
    ) -> uuid.UUID:
        """Stream an UploadFile to disk and create an IngestionJob.

        Unlike ``upload_csv``, this avoids loading the entire file into
        memory, keeping RAM usage constant regardless of file size.

        Args:
            upload_file: A FastAPI ``UploadFile`` instance.
            filename: Original client filename.
            created_by: Identifier of user performing the upload.

        Returns:
            UUID of the created ingestion job.
        """
        saved_path = await self._storage.save_upload_stream(upload_file, filename)
        abs_path = str(self._storage.get_file_path(saved_path))

        record = {
            "filename": filename,
            "file_path": abs_path,
            "status": "pending",
            "created_by": created_by,
        }
        job = await self._ingestion_repo.create(record)
        return job.id

    # ── background ingestion ──────────────────────────────────────────

    async def process_ingestion(self, job_id: uuid.UUID) -> None:
        """Run bulk loader against the saved CSV file. Designed as a background task.

        Optimisations over the naive approach:
        *   A single dedicated session is reused for all progress updates.
        *   The ``ix_products_ean`` index is dropped before the bulk load
            and recreated afterwards (CONCURRENTLY) to avoid per-row
            index maintenance overhead.
        *   Progress updates are throttled to every 500K rows or 5 s.

        Args:
            job_id: ID of the IngestionJob to process.
        """
        from sqlalchemy import text

        from src.infrastructure.database import get_session_factory
        from src.products.ingestion_repository import IngestionJobRepository

        session_factory = get_session_factory()

        # ── fetch the job record ──────────────────────────────────────
        async with session_factory() as init_session:
            repo = IngestionJobRepository(init_session)
            job = await repo.get_by_id(job_id)

        if not job:
            logger.error("Ingestion job '%s' not found.", job_id)
            return

        logger.info(
            "Starting ingestion processing for job '%s' (%s)",
            job_id, job.filename,
        )

        # ── single session for all progress updates ───────────────────
        progress_session_ctx = session_factory()
        progress_session = await progress_session_ctx.__aenter__()
        progress_repo = IngestionJobRepository(progress_session)

        async def update_job(status_str: str, result_dict: dict[str, Any] | None = None) -> None:
            try:
                await progress_repo.update_status(job_id, status_str, result=result_dict)
            except Exception as exc:
                logger.warning("Progress update failed for job '%s': %s", job_id, exc)

        try:
            await update_job("processing")

            # ── count exact total rows by scanning newlines ───────────
            total_rows_count: int | None = None
            try:
                # Read CSV in binary 10MB chunks and count newlines (extremely fast)
                count = 0
                with open(job.file_path, "rb") as f:
                    for chunk in iter(lambda: f.read(10 * 1024 * 1024), b""):
                        count += chunk.count(b"\n")

                if count > 0:
                    # Check if the last character is a newline. If not, add 1.
                    try:
                        with open(job.file_path, "rb") as f:
                            f.seek(-1, 2)
                            last_char = f.read(1)
                            if last_char != b"\n" and last_char != b"\r":
                                count += 1
                    except Exception:
                        pass
                    # Subtract 1 for the header row
                    total_rows_count = max(0, count - 1)
                else:
                    total_rows_count = 0

                await update_job("processing", {"total_rows": total_rows_count})
                logger.info("Counted exact %d total rows for job '%s'", total_rows_count, job_id)
            except Exception as e:
                logger.warning("Failed to count exact total rows for job '%s': %s", job_id, e)

            # ── drop EAN index for faster inserts ─────────────────────
            ean_index_dropped = False
            try:
                if total_rows_count and total_rows_count >= 1_000_000:
                    async with session_factory() as idx_session:
                        conn = await idx_session.connection()
                        raw = await conn.get_raw_connection()
                        drv = raw.driver_connection
                        # Check if index exists before dropping
                        exists = await drv.fetchval(
                            "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_ean'"
                        )
                        if exists:
                            await drv.execute("DROP INDEX IF EXISTS ix_products_ean")
                            ean_index_dropped = True
                            logger.info("Dropped ix_products_ean index for bulk load")
            except Exception as e:
                logger.warning("Could not drop EAN index (non-fatal): %s", e)

            # ── run the bulk loader (parallel workers) ─────────────────
            try:
                from src.infrastructure.database import get_engine

                loader = PostgresBulkLoader(
                    get_engine(),
                    num_workers=4,
                    chunk_size=100_000,
                    merge_every_n_chunks=1,
                    max_error_details=200,
                )

                last_progress_at = monotonic()
                last_reported_rows = 0

                async def progress_callback(progress: Any) -> None:
                    nonlocal last_progress_at, last_reported_rows

                    now = monotonic()
                    delta = progress.success_count - last_reported_rows

                    # Throttle: only update every 500K rows or 5 seconds
                    if (
                        delta < _PROGRESS_UPDATE_MIN_ROWS
                        and (now - last_progress_at) < _PROGRESS_UPDATE_INTERVAL_SECONDS
                    ):
                        return

                    await update_job(
                        "processing",
                        {
                            "total_rows": total_rows_count,
                            "processed_rows": progress.success_count,
                            "error_count": progress.error_count,
                            "errors": [
                                {"row": e.row_number, "field": e.field, "msg": e.message}
                                for e in progress.errors[:100]
                            ],
                        },
                    )
                    last_progress_at = now
                    last_reported_rows = progress.success_count

                result = await loader.load_csv(
                    job.file_path,
                    on_progress=progress_callback,
                    expected_total_rows=total_rows_count,
                )

                # ── finalise ──────────────────────────────────────────
                await update_job(
                    "completed",
                    {
                        "total_rows": result.total_rows,
                        "processed_rows": result.success_count,
                        "error_count": result.error_count,
                        "errors": [
                            {"row": e.row_number, "field": e.field, "msg": e.message}
                            for e in result.errors[:200]
                        ],
                    },
                )
                logger.info(
                    "Ingestion completed for job '%s'. Success: %d, Errors: %d",
                    job_id, result.success_count, result.error_count,
                )

                # Run ANALYZE after large imports to update planner statistics
                if result.success_count >= _ANALYZE_MIN_INSERTED_ROWS:
                    try:
                        logger.info(
                            "Running ANALYZE products after large ingestion (%d rows)...",
                            result.success_count,
                        )
                        async with session_factory() as analyze_session:
                            await analyze_session.execute(text("ANALYZE products"))
                            await analyze_session.commit()
                        logger.info("ANALYZE products completed successfully.")
                    except Exception as ex:
                        logger.warning("Failed to run ANALYZE on products: %s", ex)

            except Exception as e:
                logger.exception("Ingestion failed fatally for job '%s'", job_id)
                await update_job(
                    "failed",
                    {"errors": [{"row": 0, "field": "fatal", "msg": str(e)}]},
                )

            # ── recreate EAN index ────────────────────────────────────
            if ean_index_dropped:
                try:
                    from src.infrastructure.database import get_engine
                    engine = get_engine()
                    async with engine.connect() as conn:
                        # Set autocommit (isolation_level="AUTOCOMMIT") to run CREATE INDEX CONCURRENTLY
                        autocommit_conn = conn.execution_options(isolation_level="AUTOCOMMIT")
                        await autocommit_conn.execute(
                            text("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_ean ON products (ean)")
                        )
                        logger.info("Recreated ix_products_ean index after bulk load")
                except Exception as e:
                    logger.warning("Failed to recreate EAN index (non-fatal): %s", e)

        finally:
            # Close the progress session
            try:
                await progress_session_ctx.__aexit__(None, None, None)
            except Exception:
                pass

            # Clean up the uploaded CSV file from disk to save space
            try:
                await self._storage.delete(job.file_path)
            except Exception as e:
                logger.warning("Failed to clean up uploaded file '%s': %s", job.file_path, e)

    # ── status queries ────────────────────────────────────────────────

    async def get_ingestion_status(self, job_id: uuid.UUID) -> IngestionStatusResponse:
        """Retrieve progress and statistics for a bulk load job.

        Args:
            job_id: ID of the IngestionJob.

        Returns:
            IngestionStatusResponse structure.
        """
        job = await self._ingestion_repo.get_by_id(job_id)
        if not job:
            raise ProductNotFoundError(f"Ingestion job: {job_id}")

        job_resp = IngestionJobResponse.model_validate(job)
        now = utc_now()
        started_at = ensure_utc(job.started_at)
        completed_at = ensure_utc(job.completed_at)
        rows_processed = job.processed_rows + job.error_count

        # Calculate progress percent
        progress = 0.0
        if job.status == "completed" or job.status == "failed":
            progress = 100.0
        elif job.total_rows and job.total_rows > 0:
            progress = (rows_processed / job.total_rows) * 100.0
            # Cap progress at 99% while job is still active/processing to prevent showing 100% too early
            if job.status == "processing":
                progress = min(99.0, progress)
            else:
                progress = min(100.0, progress)
        elif job.processed_rows > 0:
            # If total_rows is not yet calculated, show a safe minimum progress based on processed
            progress = min(99.0, (job.processed_rows / 1000000.0) * 100.0)  # scale arbitrarily

        elapsed_seconds: float | None = None
        current_rows_per_second: float | None = None
        estimated_remaining_seconds: float | None = None
        estimated_completion_at = completed_at

        if started_at is not None:
            effective_end = completed_at or now
            elapsed_seconds = max(0.0, (effective_end - started_at).total_seconds())
            if elapsed_seconds > 0 and rows_processed > 0:
                current_rows_per_second = rows_processed / elapsed_seconds

        if job.status == "processing" and current_rows_per_second and job.total_rows:
            remaining_rows = max(job.total_rows - rows_processed, 0)
            estimated_remaining_seconds = remaining_rows / current_rows_per_second
            estimated_completion_at = now + timedelta(seconds=estimated_remaining_seconds)
        elif job.status in ("completed", "failed"):
            estimated_remaining_seconds = 0.0

        errors: list[dict[str, Any]] = []
        if isinstance(job.error_details, list):
            errors = [
                {
                    "row": item.get("row", 0),
                    "field": item.get("field", "unknown"),
                    "msg": item.get("msg") or item.get("message") or "Unknown error",
                }
                for item in job.error_details[:200]
                if isinstance(item, dict)
            ]

        return IngestionStatusResponse(
            job=job_resp,
            progress_percentage=round(progress, 2),
            current_rows_per_second=(
                round(current_rows_per_second, 2)
                if current_rows_per_second is not None
                else None
            ),
            elapsed_seconds=(round(elapsed_seconds, 1) if elapsed_seconds is not None else None),
            estimated_remaining_seconds=(
                round(estimated_remaining_seconds, 1)
                if estimated_remaining_seconds is not None
                else None
            ),
            estimated_completion_at=estimated_completion_at,
            errors=errors,
        )

    async def get_recent_jobs(
        self,
        pagination: PaginationParams,
    ) -> PaginatedResponse[IngestionJobResponse]:
        """List recent ingestion jobs with pagination."""
        offset = (pagination.page - 1) * pagination.page_size
        jobs, total = await self._ingestion_repo.get_recent(
            offset=offset,
            limit=pagination.page_size,
        )
        items = [IngestionJobResponse.model_validate(job) for job in jobs]
        return paginate(items, total, pagination)
