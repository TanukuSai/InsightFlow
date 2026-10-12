import uuid
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.models.dataset import Dataset
from app.models.analysis import AnalysisJob
from app.schemas.analysis import AnalysisStartRequest, AnalysisJobResponse
from app.services.analysis_service import AnalysisService
from app.services.issue_service import IssueService
from app.services.recommendation_service import RecommendationService
from app.db.session import AsyncSessionLocal
from app.core.logging import logger

router = APIRouter()


async def run_full_pipeline_task(
    dataset_id: str,
    workspace_id: str,
    job_id: str,
    sample_size: int = None,
    provider: str = "hybrid-nlp",
    model: str = "v1.0-balanced",
):
    async with AsyncSessionLocal() as session:
        try:
            logger.info(f"Background task starting analysis for dataset {dataset_id}...")
            await AnalysisService.run_dataset_analysis(
                dataset_id=dataset_id,
                workspace_id=workspace_id,
                job_id=job_id,
                db=session,
                sample_size=sample_size,
                provider_name=provider,
                model_name=model,
            )
            # Link issues
            logger.info("Extracting and linking issues with evidence...")
            issues = await IssueService.extract_and_link_issues(
                dataset_id=dataset_id,
                workspace_id=workspace_id,
                db=session,
            )
            # Generate recommendations
            logger.info("Generating intelligent recommendations...")
            await RecommendationService.generate_recommendations_for_issues(
                dataset_id=dataset_id,
                workspace_id=workspace_id,
                issues=issues,
                db=session,
            )
            logger.info(f"Pipeline complete for dataset {dataset_id}!")
        except Exception as e:
            logger.error(f"Error in background analysis pipeline: {e}")
            stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
            res = await session.execute(stmt)
            job = res.scalar_one_or_none()
            if job:
                job.status = "failed"
                job.error_message = str(e)
                await session.commit()


@router.post(
    "/datasets/{dataset_id}/analysis",
    response_model=AnalysisJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_analysis(
    dataset_id: str,
    payload: AnalysisStartRequest,
    background_tasks: BackgroundTasks,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    # Verify dataset exists in workspace
    stmt = select(Dataset).where(
        Dataset.id == dataset_id,
        Dataset.workspace_id == current_user.workspace_id,
    )
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found in workspace")

    # Create AnalysisJob
    job_id = f"aj-{uuid.uuid4().hex[:12]}"
    job = AnalysisJob(
        id=job_id,
        workspace_id=current_user.workspace_id,
        dataset_id=dataset_id,
        status="queued",
        total_items=dataset.row_count,
        provider=payload.provider or "hybrid-nlp",
        model=payload.model or "v1.0-balanced",
    )
    db.add(job)
    dataset.status = "analyzing"
    await db.commit()
    await db.refresh(job)

    # Launch durable background task
    background_tasks.add_task(
        run_full_pipeline_task,
        dataset_id=dataset_id,
        workspace_id=current_user.workspace_id,
        job_id=job.id,
        sample_size=payload.sample_size,
        provider=job.provider,
        model=job.model,
    )

    return job


@router.get("/analysis/{analysis_id}", response_model=AnalysisJobResponse)
async def get_analysis_status(
    analysis_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(AnalysisJob).where(
        AnalysisJob.id == analysis_id,
        AnalysisJob.workspace_id == current_user.workspace_id,
    )
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job


@router.post("/analysis/{analysis_id}/retry", response_model=AnalysisJobResponse)
async def retry_analysis(
    analysis_id: str,
    background_tasks: BackgroundTasks,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(AnalysisJob).where(
        AnalysisJob.id == analysis_id,
        AnalysisJob.workspace_id == current_user.workspace_id,
    )
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    job.status = "queued"
    job.error_message = None
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(
        run_full_pipeline_task,
        dataset_id=job.dataset_id,
        workspace_id=current_user.workspace_id,
        job_id=job.id,
        provider=job.provider,
        model=job.model,
    )

    return job
