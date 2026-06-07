"""FastAPI router for product inventory lookups and bulk ingestion.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status

from src.app.dependencies import get_product_service
from src.auth.dependencies import require_permissions
from src.auth.permissions import Permission
from src.auth.schemas import TokenPayload
from src.products.schemas import (
    IngestionJobResponse,
    IngestionStatusResponse,
    ProductLookupResponse,
    UploadResponse,
)
from src.products.service import ProductService
from src.shared.pagination import PaginatedResponse, PaginationParams

router = APIRouter(prefix="/products", tags=["Products"])


@router.get(
    "/stats",
    response_model=dict,
    summary="Get total inventory count stats.",
    dependencies=[Depends(require_permissions(Permission.PRODUCTS_VIEW))],
)
async def get_stats(
    product_service: ProductService = Depends(get_product_service),
) -> dict:
    """Return the total count of products loaded in the database."""
    count = await product_service._repo.count()
    return {"count": count}


@router.get(
    "/upload/recent",
    response_model=PaginatedResponse[IngestionJobResponse],
    summary="List recent ingestion jobs.",
    dependencies=[Depends(require_permissions(Permission.PRODUCTS_UPLOAD))],
)
async def get_recent_jobs(
    pagination: PaginationParams = Depends(),
    product_service: ProductService = Depends(get_product_service),
) -> PaginatedResponse[IngestionJobResponse]:
    """Retrieve lists of recent ingestion jobs."""
    return await product_service.get_recent_jobs(pagination)


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload product CSV sheet for async bulk ingestion.",
)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(require_permissions(Permission.PRODUCTS_UPLOAD)),
    product_service: ProductService = Depends(get_product_service),
) -> UploadResponse:
    """Upload a CSV file of products. Streams to disk, then runs bulk insertion in the background."""
    # Stream file to disk in 1 MB chunks — no full-file memory load
    job_id = await product_service.upload_csv_stream(
        file,
        file.filename or "uploaded_inventory.csv",
        created_by=current_user.username,
    )
    # Queue background task to parse and COPY CSV records
    background_tasks.add_task(product_service.process_ingestion, job_id)

    return UploadResponse(
        job_id=job_id,
        status="pending",
        message="CSV upload accepted. Bulk ingestion job queued in the background.",
    )


@router.get(
    "/upload/{job_id}/status",
    response_model=IngestionStatusResponse,
    summary="Get progress of a bulk ingestion job.",
    dependencies=[Depends(require_permissions(Permission.PRODUCTS_UPLOAD))],
)
async def get_job_status(
    job_id: uuid.UUID,
    product_service: ProductService = Depends(get_product_service),
) -> IngestionStatusResponse:
    """Query current status and validation error details for an ingestion job."""
    return await product_service.get_ingestion_status(job_id)


@router.get(
    "/{wid}",
    response_model=ProductLookupResponse,
    summary="Look up product reference by WID.",
    dependencies=[Depends(require_permissions(Permission.PRODUCTS_VIEW))],
)
async def lookup_product(
    wid: str,
    product_service: ProductService = Depends(get_product_service),
) -> ProductLookupResponse:
    """Retrieve product details by Warehouse ID (WID). Uses Redis cache-aside."""
    product = await product_service.get_product(wid)
    return ProductLookupResponse(found=True, product=product)
