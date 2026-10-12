from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AdaptionConfigStatus(BaseModel):
    configured: bool
    api_key_set: bool
    key_prefix: Optional[str] = None
    sdk_version: str
    message: str
    public_operations_enabled: bool = False
    daily_estimates_remaining: Optional[int] = None
    daily_runs_remaining: Optional[int] = None
    daily_estimates_limit: Optional[int] = None
    daily_runs_limit: Optional[int] = None


class AdaptionEstimateRequest(BaseModel):
    dataset_id: str
    column_mapping: Optional[Dict[str, Any]] = None
    max_rows: Optional[int] = Field(default=250, ge=1, le=1000)


class AdaptionEstimateResponse(BaseModel):
    local_job_id: str
    dataset_id: str
    adaption_dataset_id: Optional[str] = None
    estimated_credits: Optional[float] = None
    estimated_minutes: Optional[float] = None
    column_mapping_used: Dict[str, Any]
    message: str


class AdaptionRunRequest(BaseModel):
    dataset_id: str
    column_mapping: Optional[Dict[str, Any]] = None
    job_specification: Optional[Dict[str, Any]] = None


class AdaptionJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    dataset_id: str
    adaption_dataset_id: Optional[str] = None
    adaption_run_id: Optional[str] = None
    operation_type: str
    status: str
    column_mapping: Dict[str, Any]
    job_specification: Dict[str, Any]
    estimated_credits: Optional[float] = None
    estimated_minutes: Optional[float] = None
    result_metadata: Dict[str, Any]
    error_message: Optional[str] = None
    output_download_available: bool = False
    created_at: datetime
    completed_at: Optional[datetime] = None
