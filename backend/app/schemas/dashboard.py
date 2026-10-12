from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel
from app.schemas.issue import IssueResponse
from app.schemas.recommendation import RecommendationResponse
from app.schemas.feedback import FeedbackResponse


class SentimentDistribution(BaseModel):
    positive: int = 0
    neutral: int = 0
    negative: int = 0
    mixed: int = 0
    unknown: int = 0
    total_analyzed: int = 0


class RepeatedStatement(BaseModel):
    statement: str
    category: str
    count: int
    sample_feedback_ids: List[str] = []


class DashboardResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    total_source_rows: int
    unique_exact_statements: int
    repeated_rows: int
    has_timestamps: bool
    temporal_available: bool
    temporal_message: str

    analysis_status: str  # unanalysed, analyzing, completed, partial, failed
    analysis_provider: Optional[str] = None
    analysis_model: Optional[str] = None

    source_category_distribution: Dict[str, int]
    sentiment_distribution: Optional[SentimentDistribution] = None
    average_sentiment_score: Optional[float] = None

    top_recurring_issues: List[IssueResponse] = []
    top_recommendations: List[RecommendationResponse] = []
    top_repeated_statements: List[RepeatedStatement] = []
    sample_feedbacks: List[FeedbackResponse] = []

    limitations: List[str]
    last_updated: datetime
