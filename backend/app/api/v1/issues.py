from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.models.issue import Issue
from app.schemas.issue import IssueResponse, IssueWithEvidenceResponse, IssueUpdate, EvidenceFeedbackItem
from app.services.issue_service import IssueService

router = APIRouter()


@router.get("/issues", response_model=List[IssueResponse])
async def list_issues(
    dataset_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    query = select(Issue).where(Issue.workspace_id == current_user.workspace_id)
    if dataset_id:
        query = query.where(Issue.dataset_id == dataset_id)
    if priority:
        query = query.where(Issue.priority == priority)
    if status_filter:
        query = query.where(Issue.status == status_filter)
    if category:
        query = query.where(Issue.category == category)

    query = query.order_by(Issue.supporting_count.desc())
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/issues/{issue_id}", response_model=IssueWithEvidenceResponse)
async def get_issue_details(
    issue_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    data = await IssueService.get_issue_with_evidence(
        issue_id=issue_id,
        workspace_id=current_user.workspace_id,
        db=db,
    )
    if not data:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue = data["issue"]
    evidence = [EvidenceFeedbackItem(**item) for item in data["supporting_evidence"]]

    resp = IssueWithEvidenceResponse.model_validate(issue)
    resp.supporting_evidence = evidence
    return resp


@router.patch("/issues/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: str,
    payload: IssueUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Issue).where(
        Issue.id == issue_id,
        Issue.workspace_id == current_user.workspace_id,
    )
    issue = (await db.execute(stmt)).scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if payload.title is not None:
        issue.title = payload.title
    if payload.summary is not None:
        issue.summary = payload.summary
    if payload.priority is not None:
        issue.priority = payload.priority
    if payload.status is not None:
        issue.status = payload.status
    if payload.is_tracked is not None:
        issue.is_tracked = payload.is_tracked

    await db.commit()
    await db.refresh(issue)
    return issue


@router.post("/issues/{issue_id}/track", response_model=IssueResponse)
async def track_issue(
    issue_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Issue).where(
        Issue.id == issue_id,
        Issue.workspace_id == current_user.workspace_id,
    )
    issue = (await db.execute(stmt)).scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.is_tracked = True
    await db.commit()
    await db.refresh(issue)
    return issue


@router.delete("/issues/{issue_id}/track", response_model=IssueResponse)
async def untrack_issue(
    issue_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Issue).where(
        Issue.id == issue_id,
        Issue.workspace_id == current_user.workspace_id,
    )
    issue = (await db.execute(stmt)).scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.is_tracked = False
    await db.commit()
    await db.refresh(issue)
    return issue
