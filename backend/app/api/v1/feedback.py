from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.models.feedback import Feedback
from app.models.dataset import Dataset
from app.schemas.feedback import FeedbackCreate, FeedbackUpdate, FeedbackResponse
from app.schemas.common import PaginatedResponse
from app.core.rate_limit import rate_limit_feedback

router = APIRouter()


@router.get("/feedback", response_model=PaginatedResponse[FeedbackResponse])
async def list_feedback(
    dataset_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    exact_text: Optional[str] = Query(None),
    analysis_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    query = select(Feedback).where(Feedback.workspace_id == current_user.workspace_id)

    if dataset_id:
        query = query.where(Feedback.dataset_id == dataset_id)
    if category:
        query = query.where(Feedback.source_category == category)
    if sentiment:
        query = query.where(Feedback.sentiment_label == sentiment)
    if analysis_status:
        query = query.where(Feedback.analysis_status == analysis_status)
    if exact_text:
        query = query.where(Feedback.original_text == exact_text)
    elif search:
        query = query.where(Feedback.original_text.ilike(f"%{search}%"))

    # Total count
    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Feedback.created_at.desc()).offset(offset).limit(page_size)
    items = (await db.execute(query)).scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse[FeedbackResponse](
        items=list(items),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    payload: FeedbackCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    _rate_limit: None = Depends(rate_limit_feedback),
):
    # Verify dataset exists in workspace
    ds_stmt = select(Dataset).where(
        Dataset.id == payload.dataset_id,
        Dataset.workspace_id == current_user.workspace_id,
    )
    dataset = (await db.execute(ds_stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found in current workspace")

    fb = Feedback(
        workspace_id=current_user.workspace_id,
        dataset_id=payload.dataset_id,
        original_text=payload.original_text,
        source_category=payload.source_category,
        source_timestamp=payload.source_timestamp,
        source_identifier=payload.source_identifier,
        analysis_status="pending",
    )
    db.add(fb)

    # Increment dataset count
    dataset.row_count += 1
    dataset.valid_rows += 1
    dataset.unique_feedback_count += 1

    await db.commit()
    await db.refresh(fb)
    return fb


@router.get("/feedback/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback(
    feedback_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Feedback).where(
        Feedback.id == feedback_id,
        Feedback.workspace_id == current_user.workspace_id,
    )
    fb = (await db.execute(stmt)).scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback entry not found")
    return fb


@router.patch("/feedback/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback(
    feedback_id: str,
    payload: FeedbackUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Feedback).where(
        Feedback.id == feedback_id,
        Feedback.workspace_id == current_user.workspace_id,
    )
    fb = (await db.execute(stmt)).scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback entry not found")

    if payload.source_category is not None:
        fb.source_category = payload.source_category
    if payload.sentiment_label is not None:
        fb.sentiment_label = payload.sentiment_label
    if payload.primary_topic is not None:
        fb.primary_topic = payload.primary_topic

    await db.commit()
    await db.refresh(fb)
    return fb
