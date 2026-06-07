"""FastAPI router for product validation logs and submissions.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status

from src.app.dependencies import (
    get_ai_processing_service,
    get_settings_service,
    get_validation_service,
)
from src.auth.dependencies import require_permissions
from src.auth.exceptions import AuthorizationError
from src.auth.permissions import Permission
from src.auth.schemas import TokenPayload
from src.settings.schemas import AIProcessingMode
from src.settings.service import SettingsService
from src.shared.pagination import PaginatedResponse, PaginationParams, paginate
from src.validation.ai_processing_service import AIProcessingService
from src.validation.schemas import ValidationResponse, ValidationWithProductResponse
from src.validation.service import ValidationService

router = APIRouter(prefix="/validation", tags=["Validation"])


@router.post(
    "/verify",
    response_model=ValidationWithProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record product package physical check and run AI cross-validation.",
)
async def verify_product(
    background_tasks: BackgroundTasks,
    wid: str = Form(..., description="Warehouse product identifier."),
    validation_status: str = Form(..., description="Operator decision: VERIFIED or MISMATCH."),
    notes: str | None = Form(None, description="Optional operator notes."),
    file: UploadFile = File(..., description="Physical package label photograph."),
    current_user: TokenPayload = Depends(require_permissions(Permission.VALIDATION_VERIFY)),
    validation_service: ValidationService = Depends(get_validation_service),
    settings_service: SettingsService = Depends(get_settings_service),
    ai_processing_service: AIProcessingService = Depends(get_ai_processing_service),
) -> ValidationWithProductResponse:
    """Submit a physical product package verification.

    Takes a photo upload, saves it, queues AI processing when configured for the
    user's role, and returns the stored verification record immediately.
    """
    image_content = await file.read()

    ai_mode = await settings_service.get_mode_for_role(current_user.role)
    ai_status = "not_allowed"
    ai_error_message: str | None = None

    if ai_mode == AIProcessingMode.AUTOMATIC:
        if ai_processing_service.is_available:
            ai_status = "queued"
        else:
            ai_status = "failed"
            ai_error_message = "AI provider is not configured for background processing."
    elif ai_mode == AIProcessingMode.MANUAL:
        ai_status = "not_requested"

    response = await validation_service.verify_product(
        wid=wid,
        validation_status=validation_status,
        image_data=image_content,
        image_filename=file.filename or "verification.jpg",
        verified_by=current_user.username,
        notes=notes,
        ai_processing_mode=ai_mode.value,
        ai_processing_status=ai_status,
        ai_provider_name=ai_processing_service.provider_name,
        ai_error_message=ai_error_message,
    )

    if ai_mode == AIProcessingMode.AUTOMATIC and ai_processing_service.is_available:
        background_tasks.add_task(ai_processing_service.process_log, response.validation.id)

    return response


@router.get(
    "/logs",
    response_model=PaginatedResponse[ValidationResponse],
    summary="Retrieve validation audit logs by date range.",
    dependencies=[Depends(require_permissions(Permission.VALIDATION_VIEW_LOGS))],
)
async def get_validation_logs(
    start_date: datetime,
    end_date: datetime,
    pagination: PaginationParams = Depends(),
    validation_service: ValidationService = Depends(get_validation_service),
) -> PaginatedResponse[ValidationResponse]:
    """Retrieve validation logs within a specified date window. Supports offset pagination."""
    logs, total = await validation_service.get_logs_by_date_range(
        start_date=start_date,
        end_date=end_date,
        pagination=pagination,
    )
    # Serialize results to matching schema format
    items = [ValidationResponse.model_validate(log) for log in logs]
    return paginate(items, total, pagination)


@router.get(
    "/history/{wid}",
    response_model=list[ValidationResponse],
    summary="Get all historical validation events for a product WID.",
    dependencies=[Depends(require_permissions(Permission.VALIDATION_VIEW_LOGS))],
)
async def get_product_history(
    wid: str,
    validation_service: ValidationService = Depends(get_validation_service),
) -> list[ValidationResponse]:
    """Fetch complete audit check history for a specific warehouse product ID (WID)."""
    return await validation_service.get_product_validation_history(wid)


@router.get(
    "/logs/{log_id}",
    response_model=ValidationResponse,
    summary="Get detailed validation log data for a single audit row.",
    dependencies=[Depends(require_permissions(Permission.VALIDATION_VIEW_LOGS))],
)
async def get_validation_log_detail(
    log_id: int,
    validation_service: ValidationService = Depends(get_validation_service),
) -> ValidationResponse:
    """Fetch one validation log, including stored image and AI details."""
    return await validation_service.get_validation_log(log_id)


@router.post(
    "/logs/{log_id}/ai-process",
    response_model=ValidationResponse,
    summary="Queue AI processing for a validation log.",
)
async def queue_validation_log_ai_processing(
    log_id: int,
    background_tasks: BackgroundTasks,
    current_user: TokenPayload = Depends(require_permissions(Permission.VALIDATION_VERIFY)),
    settings_service: SettingsService = Depends(get_settings_service),
    ai_processing_service: AIProcessingService = Depends(get_ai_processing_service),
) -> ValidationResponse:
    """Allow eligible users to manually trigger background AI processing."""
    role_mode = await settings_service.get_mode_for_role(current_user.role)
    if role_mode == AIProcessingMode.NOT_ALLOWED:
        raise AuthorizationError("AI processing is not allowed for your role.")

    queued_log = await ai_processing_service.request_processing(log_id)
    background_tasks.add_task(ai_processing_service.process_log, log_id)
    return ValidationResponse.model_validate(queued_log)
