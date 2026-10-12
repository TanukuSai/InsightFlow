from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.core.config import settings
from app.core.rate_limit import rate_limit_import
from app.models.dataset import Dataset
from app.schemas.dataset import DatasetResponse, ImportSummaryResponse
from app.services.csv_service import CSVImportService

router = APIRouter()


@router.post("/datasets/import", response_model=ImportSummaryResponse, status_code=status.HTTP_201_CREATED)
async def import_csv_dataset(
    file: UploadFile = File(...),
    name: str = Form(None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    _rate_limit: None = Depends(rate_limit_import),
):
    dataset_name = name or (file.filename.replace(".csv", "") if file.filename else "Imported Dataset")
    dataset, summary = await CSVImportService.process_csv_file(
        file=file,
        dataset_name=dataset_name,
        workspace_id=current_user.workspace_id,
        db=db,
    )
    return summary


@router.get("/datasets", response_model=List[DatasetResponse])
async def list_datasets(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Dataset).where(
        Dataset.workspace_id == current_user.workspace_id
    ).order_by(Dataset.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Dataset).where(
        Dataset.id == dataset_id,
        Dataset.workspace_id == current_user.workspace_id,
    )
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found",
        )
    return dataset


@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    x_admin_key: Optional[str] = Header(None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    # 1. Canonical dataset can NEVER be deleted
    if dataset_id == settings.CANONICAL_DATASET_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The canonical seed dataset cannot be deleted.",
        )

    # 2. In public demo workspace mode, anonymous deletion is disabled
    if not settings.ADMIN_SECRET_KEY or x_admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dataset deletion is disabled in the public demonstration workspace to protect shared evaluation state.",
        )

    stmt = select(Dataset).where(
        Dataset.id == dataset_id,
        Dataset.workspace_id == current_user.workspace_id,
    )
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found",
        )

    await db.delete(dataset)
    await db.commit()
    return None


@router.get("/imports/{import_id}")
async def get_import_status(
    import_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    # In InsightFlow, import_id maps to dataset_id
    stmt = select(Dataset).where(
        Dataset.id == import_id,
        Dataset.workspace_id == current_user.workspace_id,
    )
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Import job not found")
    return {
        "import_id": dataset.id,
        "status": dataset.status,
        "row_count": dataset.row_count,
        "valid_rows": dataset.valid_rows,
        "unique_feedback_count": dataset.unique_feedback_count,
        "created_at": dataset.created_at,
    }
