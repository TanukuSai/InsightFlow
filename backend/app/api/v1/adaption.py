from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.models.adaption import AdaptionJob
from app.models.dataset import Dataset
from app.schemas.adaption import (
    AdaptionConfigStatus,
    AdaptionEstimateRequest,
    AdaptionEstimateResponse,
    AdaptionRunRequest,
    AdaptionJobResponse,
)
from app.services.adaption_service import AdaptionService
from app.services.adaption_quota_service import AdaptionQuotaService
from app.core.config import settings
from app.core.rate_limit import rate_limit_adaption

router = APIRouter()


@router.get("/adaption/status", response_model=AdaptionConfigStatus)
async def get_adaption_status(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    status_info = await AdaptionService.check_status(db=db)
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
            detail="Adaption external operations are currently disabled. Please contact your workspace administrator to enable them.",
        )

    # 2. Key configuration check
    if not settings.ADAPTION_API_KEY or len(settings.ADAPTION_API_KEY) < 10:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Adaption API key is not configured.",
        )

    # 3. Workspace dataset boundary check
    stmt = select(Dataset).where(
        Dataset.id == payload.dataset_id,
        Dataset.workspace_id == current_user.workspace_id,
    )
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found in this workspace.",
        )

    # 4. Defensive row cap enforcement
    raw_rows = payload.max_rows
    try:
        int_rows = int(raw_rows) if raw_rows is not None else 250
        if int_rows < 1:
            int_rows = 250
        bounded_max_rows = min(int_rows, settings.ADAPTION_MAX_ROWS)
    except (ValueError, TypeError):
        bounded_max_rows = 250

    # 5. Atomic UTC-day demo quota reservation (protects owner credits before external call)
    await AdaptionQuotaService.reserve_quota(db, operation="estimate")

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
            detail="Adaption external operations are currently disabled. Please contact your workspace administrator to enable them.",
        )

    # 2. Key configuration check
    if not settings.ADAPTION_API_KEY or len(settings.ADAPTION_API_KEY) < 10:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Adaption API key is not configured.",
        )

    # 3. Workspace dataset boundary check
    stmt = select(Dataset).where(
        Dataset.id == payload.dataset_id,
        Dataset.workspace_id == current_user.workspace_id,
    )
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found in this workspace.",
        )

    # 4. Defensive row cap enforcement (remove unsupported fields)
    spec = dict(payload.job_specification or {})
    raw_rows = spec.get("max_rows")
    try:
        int_rows = int(raw_rows) if raw_rows is not None else 250
        if int_rows < 1:
            int_rows = 250
        bounded_max_rows = min(int_rows, settings.ADAPTION_MAX_ROWS)
    except (ValueError, TypeError):
        bounded_max_rows = 250
    clean_spec = {"max_rows": bounded_max_rows}

    # 5. Atomic UTC-day demo quota reservation (protects owner credits before external call)
    await AdaptionQuotaService.reserve_quota(db, operation="run")

    try:
        job = await AdaptionService.start_adaptation_run(
            dataset_id=payload.dataset_id,
            workspace_id=current_user.workspace_id,
            column_mapping=payload.column_mapping,
            job_specification=clean_spec,
            db=db,
        )
        resp = AdaptionJobResponse.model_validate(job)
        resp.output_download_available = bool(
            job.operation_type == "adapt" and job.status == "succeeded" and job.adaption_dataset_id
        )
        return resp
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

    # Synchronize any active running jobs with upstream status
    synced_jobs = []
    for job in jobs:
        if job.status == "running" and job.adaption_dataset_id:
            try:
                updated = await AdaptionService.get_job_status(job.id, current_user.workspace_id, db)
                if updated:
                    job = updated
            except Exception as e:
                logger.warning(f"Could not refresh running job {job.id} during list: {e}")
        resp = AdaptionJobResponse.model_validate(job)
        resp.output_download_available = bool(
            job.operation_type == "adapt" and job.status == "succeeded" and job.adaption_dataset_id
        )
        synced_jobs.append(resp)

    return synced_jobs


@router.get("/adaption/jobs/{job_id}", response_model=AdaptionJobResponse)
async def get_adaption_job(
    job_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    try:
        job = await AdaptionService.get_job_status(
            job_id=job_id,
            workspace_id=current_user.workspace_id,
            db=db,
        )
    except Exception as e:
        logger.warning(f"Error refreshing job status for {job_id}: {e}")
        stmt = select(AdaptionJob).where(
            AdaptionJob.id == job_id,
            AdaptionJob.workspace_id == current_user.workspace_id,
        )
        job = (await db.execute(stmt)).scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Adaption job not found")

    resp = AdaptionJobResponse.model_validate(job)
    resp.output_download_available = bool(
        job.operation_type == "adapt" and job.status == "succeeded" and job.adaption_dataset_id
    )
    return resp


@router.get("/adaption/jobs/{job_id}/download")
async def download_adaption_job_output(
    job_id: str,
    format: str = "csv",
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    content, filename = await AdaptionService.download_adapted_dataset(
        job_id=job_id,
        workspace_id=current_user.workspace_id,
        file_format=format,
        db=db,
    )
    media_types = {
        "csv": "text/csv",
        "json": "application/json",
        "jsonl": "application/x-ndjson",
        "parquet": "application/octet-stream",
    }
    media_type = media_types.get(format, "text/csv")
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
