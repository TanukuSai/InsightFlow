from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.models.recommendation import Recommendation
from app.schemas.recommendation import RecommendationResponse, RecommendationUpdate

router = APIRouter()


@router.get("/recommendations", response_model=List[RecommendationResponse])
async def list_recommendations(
    dataset_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    query = select(Recommendation).where(
        Recommendation.workspace_id == current_user.workspace_id
    )
    if dataset_id:
        query = query.where(Recommendation.dataset_id == dataset_id)
    if priority:
        query = query.where(Recommendation.priority == priority)
    if status_filter:
        query = query.where(Recommendation.status == status_filter)

    query = query.order_by(Recommendation.created_at.desc())
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/recommendations/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation(
    recommendation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Recommendation).where(
        Recommendation.id == recommendation_id,
        Recommendation.workspace_id == current_user.workspace_id,
    )
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return rec


@router.patch("/recommendations/{recommendation_id}", response_model=RecommendationResponse)
async def update_recommendation(
    recommendation_id: str,
    payload: RecommendationUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Recommendation).where(
        Recommendation.id == recommendation_id,
        Recommendation.workspace_id == current_user.workspace_id,
    )
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if payload.action is not None:
        rec.action = payload.action
    if payload.rationale is not None:
        rec.rationale = payload.rationale
    if payload.priority is not None:
        rec.priority = payload.priority
    if payload.status is not None:
        rec.status = payload.status
    if payload.is_tracked is not None:
        rec.is_tracked = payload.is_tracked

    await db.commit()
    await db.refresh(rec)
    return rec


@router.post("/recommendations/{recommendation_id}/track", response_model=RecommendationResponse)
async def track_recommendation(
    recommendation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Recommendation).where(
        Recommendation.id == recommendation_id,
        Recommendation.workspace_id == current_user.workspace_id,
    )
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.is_tracked = True
    await db.commit()
    await db.refresh(rec)
    return rec
