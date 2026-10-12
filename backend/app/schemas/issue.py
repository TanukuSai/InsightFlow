from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class EvidenceFeedbackItem(BaseModel):
    feedback_id: str
    original_text: str
    relevance_score: float
    excerpt: Optional[str] = None
    source_category: Optional[str] = None
    sentiment_label: Optional[str] = None


class IssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    dataset_id: str
    title: str
    summary: str
    category: str
    priority: str
    priority_explanation: str
    status: str
    is_tracked: bool
    supporting_count: int
    unique_supporting_count: int
    created_at: datetime
    updated_at: datetime


class IssueWithEvidenceResponse(IssueResponse):
    supporting_evidence: List[EvidenceFeedbackItem] = []


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    is_tracked: Optional[bool] = None
