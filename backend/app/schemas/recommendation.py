from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    issue_id: str
    dataset_id: str
    action: str
    rationale: str
    expected_benefit: Optional[str] = None
    priority: str
    status: str
    is_tracked: bool
    created_at: datetime


class RecommendationUpdate(BaseModel):
    action: Optional[str] = None
    rationale: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    is_tracked: Optional[bool] = None
