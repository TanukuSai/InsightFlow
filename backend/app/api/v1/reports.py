import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.models.report import Report
from app.schemas.report import ReportCreateRequest, ReportResponse
from app.services.report_service import ReportService
from app.core.rate_limit import rate_limit_report

router = APIRouter()


@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate_report(
    payload: ReportCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    _rate_limit: None = Depends(rate_limit_report),
):
    try:
        report = await ReportService.generate_report(
            dataset_id=payload.dataset_id,
            workspace_id=current_user.workspace_id,
            title=payload.title,
            export_format=payload.format,
            db=db,
        )
        resp = ReportResponse.model_validate(report)
        resp.download_url = f"/api/v1/reports/{report.id}/export"
        return resp
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/reports", response_model=List[ReportResponse])
async def list_reports(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Report)
        .where(Report.workspace_id == current_user.workspace_id)
        .order_by(Report.created_at.desc())
    )
    reports = (await db.execute(stmt)).scalars().all()
    results = []
    for rep in reports:
        item = ReportResponse.model_validate(rep)
        item.download_url = f"/api/v1/reports/{rep.id}/export"
        results.append(item)
    return results


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report_details(
    report_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Report).where(
        Report.id == report_id,
        Report.workspace_id == current_user.workspace_id,
    )
    report = (await db.execute(stmt)).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    resp = ReportResponse.model_validate(report)
    resp.download_url = f"/api/v1/reports/{report.id}/export"
    return resp


@router.get("/reports/{report_id}/export")
async def download_report_export(
    report_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Report).where(
        Report.id == report_id,
        Report.workspace_id == current_user.workspace_id,
    )
    report = (await db.execute(stmt)).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    media_types = {
        "pdf": "application/pdf",
        "json": "application/json",
        "csv": "text/csv",
    }
    media_type = media_types.get(report.format, "application/octet-stream")
    filename = f"{report.id}.{report.format}"

    return FileResponse(
        path=report.file_path,
        media_type=media_type,
        filename=filename,
    )
