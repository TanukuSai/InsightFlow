from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AnalysisStartRequest(BaseModel):
    provider: Optional[str] = Field(default="hybrid-nlp", description="Analysis provider/method")
    model: Optional[str] = Field(default="v1.0-balanced", description="Model configuration")
    sample_size: Optional[int] = Field(default=None, description="Optional cap on rows to analyze for fast demo")


class AnalysisJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    dataset_id: str
    status: str
    total_items: int
    processed_items: int
    success_count: int
    failure_count: int
    provider: str
    model: str
    metrics: Dict[str, Any]
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
