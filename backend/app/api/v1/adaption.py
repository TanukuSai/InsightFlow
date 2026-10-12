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
):
    try:
        res = await AdaptionService.run_estimate(
            dataset_id=payload.dataset_id,
            workspace_id=current_user.workspace_id,
            column_mapping=payload.column_mapping,
            max_rows=payload.max_rows or 5000,
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
):
    try:
        job = await AdaptionService.start_adaptation_run(
            dataset_id=payload.dataset_id,
            workspace_id=current_user.workspace_id,
            column_mapping=payload.column_mapping,
            job_specification=payload.job_specification,
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
