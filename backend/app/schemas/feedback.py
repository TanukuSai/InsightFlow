from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class FeedbackCreate(BaseModel):
    dataset_id: str
    original_text: str = Field(..., min_length=1)
    source_category: Optional[str] = None
    source_timestamp: Optional[datetime] = None
    source_identifier: Optional[str] = None


class FeedbackUpdate(BaseModel):
    source_category: Optional[str] = None
    sentiment_label: Optional[str] = None
    primary_topic: Optional[str] = None


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    dataset_id: str
    original_text: str
    source_category: Optional[str] = None
    source_timestamp: Optional[datetime] = None
    source_identifier: Optional[str] = None
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    confidence_score: Optional[float] = None
    primary_topic: Optional[str] = None
    analysis_status: str
    created_at: datetime


class FeedbackFilterParams(BaseModel):
    dataset_id: Optional[str] = None
    category: Optional[str] = None
    sentiment: Optional[str] = None
    search: Optional[str] = None
    analysis_status: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)
