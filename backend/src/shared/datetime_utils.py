"""Datetime utilities for timezone-aware calculations.

Ensures all timestamps generated or processed by the system are explicitly
timezone-aware UTC, preventing timezone drift or DB comparison issues.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime

logger = logging.getLogger(__name__)


def utc_now() -> datetime:
    """Generate a timezone-aware UTC datetime.

    Returns:
        Current datetime with tzinfo=timezone.utc.
    """
    return datetime.now(UTC)


def ensure_utc(dt: datetime | None) -> datetime | None:
    """Ensure a datetime is timezone-aware UTC.

    If the datetime is naive, attaches UTC. If it is already aware,
    converts it to UTC.

    Args:
        dt: The datetime object to process.

    Returns:
        Timezone-aware UTC datetime, or None if input was None.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def parse_date(date_str: str | None) -> date | None:
    """Parse a date string in YYYY-MM-DD format.

    Args:
        date_str: Date string to parse.

    Returns:
        Parsed date object, or None if input is empty or invalid.
    """
    if not date_str:
        return None
    try:
        # Strip whitespace and any time component if present
        clean_str = date_str.strip().split(" ")[0].split("T")[0]
        return date.fromisoformat(clean_str)
    except ValueError as e:
        logger.warning("Failed to parse date string '%s': %s", date_str, e)
        return None
