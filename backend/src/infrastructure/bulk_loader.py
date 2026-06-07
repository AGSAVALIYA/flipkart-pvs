"""High-performance CSV bulk loader using asyncpg COPY with parallel workers.

Architecture
------------
::

    Reader (1 task, CPU-bound)
        │  validates rows, builds chunks of ``chunk_size`` tuples
        ▼
    asyncio.Queue  (maxsize = num_workers × 2)
        │
        ├──▶  Worker 0  (own asyncpg conn, own temp table, COPY + merge)
        ├──▶  Worker 1
        ├──▶  Worker 2
        └──▶  Worker 3

Each worker:
1.  Receives chunks from the shared queue.
2.  ``COPY`` records into its private temp table (zero conflict checking).
3.  After ``merge_every_n_chunks`` COPYs, merges temp → main table with
    a single ``INSERT … ON CONFLICT (wid) DO NOTHING``.
4.  ``TRUNCATE`` temp table and repeat.

Each worker connection runs with ``synchronous_commit = off`` so
PostgreSQL batches WAL flushes instead of flushing per-statement.
"""

from __future__ import annotations

import asyncio
import csv
import logging
import re
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine

from src.domain.exceptions import IngestionError

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# CSV column mapping
# ──────────────────────────────────────────────────────────────────────

_CSV_COLUMN_ALIASES: dict[str, tuple[str, ...]] = {
    "wid": ("WID", "wid"),
    "ean": ("EAN", "ean"),
    "manufacturing_date": ("Manufacturing_Date", "manufacturing_date"),
    "expiry_date": ("Expiry_Date", "expiry_date"),
}
_COPY_COLUMNS = (
    "wid",
    "ean",
    "manufacturing_date",
    "expiry_date",
)
_DIRECT_COPY_PROGRESS_INTERVAL_SECONDS = 0.5

# ──────────────────────────────────────────────────────────────────────
# Result dataclasses
# ──────────────────────────────────────────────────────────────────────


@dataclass(slots=True)
class RowError:
    """Details of a single row-level ingestion failure."""

    row_number: int
    field: str
    message: str


@dataclass(slots=True)
class IngestionResult:
    """Summary of a bulk ingestion operation."""

    total_rows: int = 0
    success_count: int = 0
    error_count: int = 0
    errors: list[RowError] = field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────
# WID format regex
# ──────────────────────────────────────────────────────────────────────
_WID_RE = re.compile(r"^[A-Za-z0-9_-]{6,20}$")


class DateParser:
    """Lenient date parser with successful format caching."""

    def __init__(self) -> None:
        self._formats = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y")
        self._last_format = "%Y-%m-%d"

    def parse(self, value: str) -> date | None:
        value = value.strip()
        if not value:
            return None

        # Fast path: YYYY-MM-DD
        if len(value) == 10 and value[4] == "-" and value[7] == "-":
            try:
                return date(int(value[0:4]), int(value[5:7]), int(value[8:10]))
            except ValueError:
                pass

        # Fast path: DD-MM-YYYY
        if len(value) == 10 and value[2] == "-" and value[5] == "-":
            try:
                return date(int(value[6:10]), int(value[3:5]), int(value[0:2]))
            except ValueError:
                pass

        # Fast path: DD/MM/YYYY
        if len(value) == 10 and value[2] == "/" and value[5] == "/":
            try:
                return date(int(value[6:10]), int(value[3:5]), int(value[0:2]))
            except ValueError:
                pass

        # Slow fallback
        try:
            return datetime.strptime(value, self._last_format).date()
        except ValueError:
            pass
        for fmt in self._formats:
            if fmt == self._last_format:
                continue
            try:
                dt = datetime.strptime(value, fmt).date()
                self._last_format = fmt
                return dt
            except ValueError:
                continue
        return None


# ──────────────────────────────────────────────────────────────────────
# Bulk loader
# ──────────────────────────────────────────────────────────────────────

ProgressCallback = Callable[[IngestionResult], Awaitable[Any]]


class _ProgressTrackingReader:
    """File-like wrapper that tracks bytes streamed into COPY."""

    def __init__(self, path: Path) -> None:
        self._fh = path.open("rb")
        self.total_bytes = max(path.stat().st_size, 1)
        self.bytes_read = 0

    def read(self, size: int = -1) -> bytes:
        chunk = self._fh.read(size)
        self.bytes_read += len(chunk)
        return chunk

    def close(self) -> None:
        self._fh.close()


class PostgresBulkLoader:
    """Parallel CSV → PostgreSQL loader using N asyncpg COPY workers.

    Args:
        engine: SQLAlchemy ``AsyncEngine`` used to acquire worker
            connections from the pool.
        num_workers: Number of parallel COPY workers (default 4).
        chunk_size: Rows per COPY batch (default 500 000).
        merge_every_n_chunks: COPYs accumulated per worker before
            merging into the main table (default 3).
        table_name: Target PostgreSQL table.
        yield_every_rows: Event-loop yield frequency during CSV reading.
        max_error_details: Cap on retained per-row error details.
    """

    def __init__(
        self,
        engine: AsyncEngine,
        *,
        num_workers: int = 4,
        chunk_size: int = 500_000,
        merge_every_n_chunks: int = 3,
        table_name: str = "products",
        yield_every_rows: int = 2000,
        max_error_details: int = 1_000,
    ) -> None:
        self._engine = engine
        self._num_workers = num_workers
        self._chunk_size = chunk_size
        self._merge_every_n_chunks = merge_every_n_chunks
        self._table_name = table_name
        self._date_parser = DateParser()
        self._yield_every_rows = yield_every_rows
        self._max_error_details = max_error_details

    # ── public API ────────────────────────────────────────────────────

    async def load_csv(
        self,
        file_path: str | Path,
        *,
        on_progress: ProgressCallback | None = None,
        expected_total_rows: int | None = None,
    ) -> IngestionResult:
        """Stream and load a CSV file into PostgreSQL using parallel workers.

        Returns:
            ``IngestionResult`` with totals and per-row error details.

        Raises:
            IngestionError: If the file cannot be read or has no rows.
        """
        path = Path(file_path)
        if not path.exists():
            raise IngestionError(f"CSV file not found: {path}")

        try:
            header = self._read_csv_header(path)
            column_indexes = self._resolve_csv_columns(header)
            if self._can_use_direct_copy(header, column_indexes):
                try:
                    result = await self._load_via_direct_copy(
                        path,
                        on_progress=on_progress,
                        expected_total_rows=expected_total_rows,
                    )
                except Exception as exc:
                    logger.info(
                        "Direct COPY fast path failed for '%s'; falling back to staged validation: %s",
                        path,
                        exc,
                    )
                    result = await self._load_via_validated_workers(
                        path,
                        column_indexes=column_indexes,
                        on_progress=on_progress,
                    )
            else:
                result = await self._load_via_validated_workers(
                    path,
                    column_indexes=column_indexes,
                    on_progress=on_progress,
                )
        except IngestionError:
            raise
        except Exception as exc:
            raise IngestionError(f"Failed to load CSV: {exc}") from exc

        # Final progress report
        if on_progress:
            await on_progress(result)

        return result

    # ── helpers ────────────────────────────────────────────────────────

    def _read_csv_header(self, path: Path) -> list[str]:
        with path.open(newline="", encoding="utf-8-sig") as fh:
            reader = csv.reader(fh)
            header = next(reader, None)

        if header is None:
            raise IngestionError("CSV file is empty or has no header row")

        return header

    @staticmethod
    def _can_use_direct_copy(
        header: list[str],
        column_indexes: dict[str, int],
    ) -> bool:
        if len(header) != len(_COPY_COLUMNS):
            return False

        return all(
            column_indexes[column_name] == expected_index
            for expected_index, column_name in enumerate(_COPY_COLUMNS)
        )

    async def _load_via_direct_copy(
        self,
        path: Path,
        *,
        on_progress: ProgressCallback | None,
        expected_total_rows: int | None,
    ) -> IngestionResult:
        result = IngestionResult(total_rows=expected_total_rows or 0)

        try:
            async with self._engine.connect() as sa_conn:
                raw = await sa_conn.get_raw_connection()
                apg_conn = raw.driver_connection

                await apg_conn.execute("SET synchronous_commit = off")
                tracker = _ProgressTrackingReader(path)
                copy_finished = asyncio.Event()
                progress_task: asyncio.Task[None] | None = None

                try:
                    if on_progress and expected_total_rows and expected_total_rows > 0:
                        progress_task = asyncio.create_task(
                            self._report_direct_copy_progress(
                                tracker,
                                result,
                                expected_total_rows,
                                copy_finished,
                                on_progress,
                            )
                        )

                    copy_tag = await apg_conn.copy_to_table(
                        self._table_name,
                        source=tracker,
                        columns=_COPY_COLUMNS,
                        format="csv",
                        header=True,
                    )
                finally:
                    copy_finished.set()
                    tracker.close()
                    if progress_task is not None:
                        await progress_task

                copied_rows = self._parse_copy_count(copy_tag)
                result.total_rows = copied_rows
                result.success_count = copied_rows

                if on_progress:
                    await on_progress(result)

                return result
        except Exception as exc:
            raise IngestionError(f"Direct COPY failed: {exc}") from exc

    async def _report_direct_copy_progress(
        self,
        tracker: _ProgressTrackingReader,
        result: IngestionResult,
        expected_total_rows: int,
        copy_finished: asyncio.Event,
        on_progress: ProgressCallback,
    ) -> None:
        last_reported_rows = 0

        while not copy_finished.is_set():
            await asyncio.sleep(_DIRECT_COPY_PROGRESS_INTERVAL_SECONDS)
            estimated_rows = self._estimate_rows_from_bytes(
                tracker.bytes_read,
                tracker.total_bytes,
                expected_total_rows,
            )

            if estimated_rows <= last_reported_rows:
                continue

            result.total_rows = expected_total_rows
            result.success_count = estimated_rows
            await on_progress(result)
            last_reported_rows = estimated_rows

    @staticmethod
    def _estimate_rows_from_bytes(
        bytes_read: int,
        total_bytes: int,
        expected_total_rows: int,
    ) -> int:
        if bytes_read <= 0 or total_bytes <= 0 or expected_total_rows <= 0:
            return 0

        estimated_rows = int(expected_total_rows * min(bytes_read, total_bytes) / total_bytes)
        if estimated_rows >= expected_total_rows:
            return max(0, expected_total_rows - 1)
        return estimated_rows

    async def _load_via_validated_workers(
        self,
        path: Path,
        *,
        column_indexes: dict[str, int],
        on_progress: ProgressCallback | None,
    ) -> IngestionResult:
        result = IngestionResult()
        result_lock = asyncio.Lock()
        num_workers = self._num_workers
        queue: asyncio.Queue[list[tuple[Any, ...]] | None] = asyncio.Queue(
            maxsize=num_workers * 2,
        )

        workers: list[tuple[Any, Any, str]] = []

        try:
            for _ in range(num_workers):
                sa_conn = await self._engine.connect()
                raw = await sa_conn.get_raw_connection()
                apg_conn = raw.driver_connection
                temp_table = f"_tmp_ingest_{uuid.uuid4().hex[:12]}"

                await apg_conn.execute(
                    f"CREATE TEMP TABLE {temp_table} "
                    f"(LIKE {self._table_name} INCLUDING DEFAULTS)"
                )
                await apg_conn.execute("SET synchronous_commit = off")
                workers.append((sa_conn, apg_conn, temp_table))

            async def _reader() -> None:
                chunk: list[tuple[Any, ...]] = []
                try:
                    with path.open(newline="", encoding="utf-8-sig") as fh:
                        reader = csv.reader(fh)
                        next(reader, None)

                        for row_num, row in enumerate(reader, start=1):
                            result.total_rows += 1
                            validated = self._validate_csv_row(
                                row,
                                row_num,
                                column_indexes,
                                result,
                            )
                            if validated is not None:
                                chunk.append(validated)

                            if len(chunk) >= self._chunk_size:
                                await queue.put(chunk)
                                chunk = []

                            if row_num % self._yield_every_rows == 0:
                                await asyncio.sleep(0.001)

                        if chunk:
                            await queue.put(chunk)
                finally:
                    for _ in range(num_workers):
                        while True:
                            try:
                                queue.put_nowait(None)
                                break
                            except asyncio.QueueFull:
                                current_task = asyncio.current_task()
                                if current_task is not None and current_task.cancelling():
                                    return
                                await asyncio.sleep(0)

            async def _worker(apg_conn: Any, temp_table: str) -> None:
                chunks_since_merge = 0
                rows_in_temp = 0

                while True:
                    chunk = await queue.get()
                    if chunk is None:
                        break

                    await apg_conn.copy_records_to_table(
                        temp_table,
                        records=chunk,
                        columns=_COPY_COLUMNS,
                    )
                    chunks_since_merge += 1
                    rows_in_temp += len(chunk)

                    if chunks_since_merge >= self._merge_every_n_chunks:
                        inserted, skipped = await self._do_merge(
                            temp_table,
                            apg_conn,
                            rows_in_temp,
                        )
                        async with result_lock:
                            result.success_count += inserted
                            result.error_count += skipped

                        if on_progress:
                            await on_progress(result)

                        chunks_since_merge = 0
                        rows_in_temp = 0

                if rows_in_temp > 0:
                    inserted, skipped = await self._do_merge(
                        temp_table,
                        apg_conn,
                        rows_in_temp,
                    )
                    async with result_lock:
                        result.success_count += inserted
                        result.error_count += skipped

            async with asyncio.TaskGroup() as task_group:
                task_group.create_task(_reader())
                for _, apg_conn, temp_table in workers:
                    task_group.create_task(_worker(apg_conn, temp_table))

            return result
        except Exception as exc:
            logger.exception("Validated worker load failed: %s", exc)
            raise IngestionError(f"Database load failed: {exc}") from exc
        finally:
            await self._cleanup_workers(workers)

    @staticmethod
    def _parse_copy_count(copy_tag: str) -> int:
        try:
            return int(copy_tag.rsplit(" ", maxsplit=1)[-1])
        except (AttributeError, ValueError, IndexError) as exc:
            raise IngestionError(f"Unexpected COPY result: {copy_tag!r}") from exc

    async def _cleanup_workers(
        self,
        workers: list[tuple[Any, Any, str]],
    ) -> None:
        for sa_conn, apg_conn, temp_table in workers:
            try:
                await apg_conn.execute(f"DROP TABLE IF EXISTS {temp_table}")
            except Exception:
                pass
            try:
                await sa_conn.close()
            except Exception:
                pass

    async def _do_merge(
        self,
        temp_table: str,
        apg_conn: Any,
        rows_in_temp: int,
    ) -> tuple[int, int]:
        if rows_in_temp == 0:
            return 0, 0

        try:
            cols_csv = ", ".join(_COPY_COLUMNS)
            tag = await apg_conn.execute(
                f"INSERT INTO {self._table_name} ({cols_csv}) "
                f"SELECT {cols_csv} FROM {temp_table} "
                f"ON CONFLICT (wid) DO NOTHING"
            )
            inserted = int(tag.split()[-1]) if tag else 0
            skipped = rows_in_temp - inserted

            if skipped > 0:
                logger.info(
                    "Merge: %d inserted, %d duplicate WIDs skipped",
                    inserted,
                    skipped,
                )

            await apg_conn.execute(f"TRUNCATE {temp_table}")
            return inserted, skipped
        except Exception as exc:
            logger.exception("Temp→main merge failed: %s", exc)
            raise IngestionError(f"Database merge failed: {exc}") from exc

    # ── CSV parsing ───────────────────────────────────────────────────

    def _resolve_csv_columns(self, headers: list[str]) -> dict[str, int]:
        normalized = {h.strip().lower(): i for i, h in enumerate(headers)}
        return {
            name: next(
                (normalized[a.lower()] for a in aliases if a.lower() in normalized),
                -1,
            )
            for name, aliases in _CSV_COLUMN_ALIASES.items()
        }

    @staticmethod
    def _get_csv_value(row: list[str], idx: int) -> str:
        if idx < 0 or idx >= len(row):
            return ""
        return row[idx].strip()

    def _append_error(
        self, result: IngestionResult, row: int, fld: str, msg: str,
    ) -> None:
        result.error_count += 1
        if len(result.errors) < self._max_error_details:
            result.errors.append(RowError(row, fld, msg))

    def _validate_csv_row(
        self,
        row: list[str],
        row_number: int,
        column_indexes: dict[str, int],
        result: IngestionResult,
    ) -> tuple[Any, ...] | None:
        wid = self._get_csv_value(row, column_indexes["wid"])
        wid_len = len(wid)
        if not wid or not (6 <= wid_len <= 20) or (
            not wid.isalnum() and not _WID_RE.match(wid)
        ):
            self._append_error(result, row_number, "WID", f"Invalid WID format: '{wid}'")
            return None

        ean = self._get_csv_value(row, column_indexes["ean"])
        if not ean:
            self._append_error(result, row_number, "EAN", "EAN/barcode is required")
            return None

        mfg_str = self._get_csv_value(row, column_indexes["manufacturing_date"])
        if not mfg_str:
            self._append_error(result, row_number, "Manufacturing_Date", "Manufacturing date is required")
            return None
        mfg = self._date_parser.parse(mfg_str)
        if mfg is None:
            self._append_error(result, row_number, "Manufacturing_Date", f"Unparseable date: '{mfg_str}'")
            return None

        exp_str = self._get_csv_value(row, column_indexes["expiry_date"])
        if not exp_str:
            self._append_error(result, row_number, "Expiry_Date", "Expiry date is required")
            return None
        exp = self._date_parser.parse(exp_str)
        if exp is None:
            self._append_error(result, row_number, "Expiry_Date", f"Unparseable date: '{exp_str}'")
            return None

        return (wid, ean, mfg, exp)
