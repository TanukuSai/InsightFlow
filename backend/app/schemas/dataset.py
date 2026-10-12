from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DatasetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    name: str
    original_filename: str
    row_count: int
    valid_rows: int
    invalid_rows: int
    unique_feedback_count: int
    repeat_feedback_count: int
    category_distribution: Dict[str, int]
    has_timestamps: bool
    status: str
    error_summary: Optional[str] = None
    created_at: datetime


class ImportSummaryResponse(BaseModel):
    dataset_id: str
    workspace_id: str
    name: str
    original_filename: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    unique_exact_statements: int
    repeated_rows: int
    categories: Dict[str, int]
    has_timestamps: bool
    timestamp_notes: str
    sample_rows: List[Dict[str, Any]]
