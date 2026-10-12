from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.models.adaption import AdaptionJob
from app.schemas.adaption import (
    AdaptionConfigStatus,
    AdaptionEstimateRequest,
    AdaptionEstimateResponse,
    AdaptionRunRequest,
    AdaptionJobResponse,
)
from app.services.adaption_service import AdaptionService

from app.core.config import settings
from app.core.rate_limit import rate_limit_adaption

router = APIRouter()


@router.get("/adaption/status", response_model=AdaptionConfigStatus)
async def get_adaption_status(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    status_info = AdaptionService.check_status()
    return AdaptionConfigStatus(**status_info)


@router.post("/adaption/estimate", response_model=AdaptionEstimateResponse)
async def estimate_adaptation(
    payload: AdaptionEstimateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    _rate_limit: None = Depends(rate_limit_adaption),
):
    # 1. Kill switch check
    if not settings.ENABLE_PUBLIC_ADAPTION_OPERATIONS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adaption external operations are disabled in this public demonstration environment. Set ENABLE_PUBLIC_ADAPTION_OPERATIONS=true with a valid ADAPTION_API_KEY to enable.",
        )

    # 2. Key configuration check
    if not settings.ADAPTION_API_KEY or len(settings.ADAPTION_API_KEY) < 10:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Adaption API key is not configured. Set ADAPTION_API_KEY in backend environment.",
        )

    # 3. Row cap enforcement
    bounded_max_rows = min(payload.max_rows or settings.ADAPTION_MAX_ROWS, settings.ADAPTION_MAX_ROWS)

    try:
        res = await AdaptionService.run_estimate(
            dataset_id=payload.dataset_id,
            workspace_id=current_user.workspace_id,
            column_mapping=payload.column_mapping,
            max_rows=bounded_max_rows,
            db=db,
        )
        return AdaptionEstimateResponse(**res)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Adaption API error: {str(e)}",
        )


@router.post("/adaption/jobs", response_model=AdaptionJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_adaption_run(
    payload: AdaptionRunRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    _rate_limit: None = Depends(rate_limit_adaption),
):
    # 1. Kill switch check
    if not settings.ENABLE_PUBLIC_ADAPTION_OPERATIONS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adaption external operations are disabled in this public demonstration environment. Set ENABLE_PUBLIC_ADAPTION_OPERATIONS=true with a valid ADAPTION_API_KEY to enable.",
        )

    # 2. Key configuration check
    if not settings.ADAPTION_API_KEY or len(settings.ADAPTION_API_KEY) < 10:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Adaption API key is not configured. Set ADAPTION_API_KEY in backend environment.",
        )

    # 3. Enforce strict row cap clamp on job specification
    spec = dict(payload.job_specification or {})
    requested_rows = spec.get("max_rows", settings.ADAPTION_MAX_ROWS)
    try:
        requested_rows = int(requested_rows)
    except (ValueError, TypeError):
        requested_rows = settings.ADAPTION_MAX_ROWS
    spec["max_rows"] = min(requested_rows, settings.ADAPTION_MAX_ROWS)

    try:
        job = await AdaptionService.start_adaptation_run(
            dataset_id=payload.dataset_id,
            workspace_id=current_user.workspace_id,
            column_mapping=payload.column_mapping,
            job_specification=spec,
            db=db,
        )
        return job
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to launch Adaption run: {str(e)}",
        )


@router.get("/adaption/jobs", response_model=List[AdaptionJobResponse])
async def list_adaption_jobs(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(AdaptionJob)
        .where(AdaptionJob.workspace_id == current_user.workspace_id)
        .order_by(AdaptionJob.created_at.desc())
    )
    jobs = (await db.execute(stmt)).scalars().all()
    return jobs


@router.get("/adaption/jobs/{job_id}", response_model=AdaptionJobResponse)
async def get_adaption_job(
    job_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    job = await AdaptionService.get_job_status(
        job_id=job_id,
        workspace_id=current_user.workspace_id,
        db=db,
    )
    if not job:
        raise HTTPException(status_code=404, detail="Adaption job not found")
    return job
