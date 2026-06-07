"""FastAPI router for generating inventory audit compliance reports.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends

from src.app.dependencies import get_report_service
from src.auth.dependencies import require_permissions
from src.auth.permissions import Permission
from src.reports.schemas import ReportQuery, ReportResponse, ReportSummary
from src.reports.service import ReportService
from src.shared.pagination import PaginationParams

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get(
    "",
    response_model=ReportResponse,
    summary="Generate a comprehensive compliance audit report.",
    dependencies=[Depends(require_permissions(Permission.REPORTS_VIEW))],
)
async def generate_compliance_report(
    start_date: date,
    end_date: date,
    pagination: PaginationParams = Depends(),
    report_service: ReportService = Depends(get_report_service),
) -> ReportResponse:
    """Retrieve summarized verification statistics and paginated audit records for a date range."""
    # Triggers schema cross-field validation to ensure start <= end
    ReportQuery(start_date=start_date, end_date=end_date)
    return await report_service.generate_report(start_date, end_date, pagination)


@router.get(
    "/summary",
    response_model=ReportSummary,
    summary="Get aggregated compliance stats without detail rows.",
    dependencies=[Depends(require_permissions(Permission.REPORTS_VIEW))],
)
async def get_compliance_summary(
    start_date: date,
    end_date: date,
    report_service: ReportService = Depends(get_report_service),
) -> ReportSummary:
    """Retrieve compliance metrics (total, verified, mismatch) for a date range."""
    # Triggers schema cross-field validation to ensure start <= end
    ReportQuery(start_date=start_date, end_date=end_date)
    return await report_service.get_report_summary(start_date, end_date)
