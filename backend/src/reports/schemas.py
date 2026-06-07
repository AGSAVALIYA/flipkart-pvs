"""Pydantic schemas for QA and audit report responses.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from src.shared.pagination import PaginatedResponse


class ReportQuery(BaseModel):
    """Query validation bounds for compiling reports."""

    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_dates(self) -> ReportQuery:
        """Ensure start_date occurs before or equal to end_date."""
        if self.start_date > self.end_date:
            raise ValueError("Start date must be less than or equal to end date.")
        return self


class ReportSummary(BaseModel):
    """Aggregated statistics across verification logs."""

    total_verifications: int = 0
    verified_count: int = 0
    mismatch_count: int = 0
    pending_count: int = 0
    date_range_start: datetime
    date_range_end: datetime


class ReportRow(BaseModel):
    """A single detailed audit row combining log and product barcode metadata."""

    id: int
    wid: str
    ean: str = Field(default="—")
    validation_status: str
    verified_by: str
    verified_at: datetime
    ai_match_result: str | None = None
    ai_processing_status: str | None = None


class ReportResponse(BaseModel):
    """Complete report envelope enclosing summarized stats and paginated detail records."""

    summary: ReportSummary
    logs: PaginatedResponse[ReportRow]
