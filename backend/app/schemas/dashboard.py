from typing import Dict, List, Optional
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
    coverage_pct: Optional[float] = None


class RepeatedStatement(BaseModel):
    statement: str
    category: str
    count: int
    extra_duplicates: int = 0
    dataset_share_pct: float = 0.0
    sample_feedback_ids: List[str] = []


class DashboardResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    total_source_rows: int
    valid_rows: int = 0
    valid_feedback_count: int = 0
    invalid_rows: int = 0
    invalid_source_rows: int = 0
    unique_exact_statements: int = 0
    distinct_comment_texts: int = 0
    repeated_rows: int = 0
    extra_duplicate_occurrences: int = 0
    extra_duplicate_copies: int = 0
    rows_in_repeated_groups: int = 0
    comments_in_repeated_groups: int = 0
    total_categorized_rows: int = 0
    has_timestamps: bool = False
    temporal_available: bool = False
    temporal_message: str

    analysis_status: str  # unanalysed, analyzing, completed, partial, failed
    analysis_provider: Optional[str] = None
    analysis_model: Optional[str] = None
    sentiment_analyzed_count: int = 0
    sentiment_coverage_pct: Optional[float] = None

    source_category_distribution: Dict[str, int]
    sentiment_distribution: Optional[SentimentDistribution] = None
    average_sentiment_score: Optional[float] = None

    top_recurring_issues: List[IssueResponse] = []
    top_recommendations: List[RecommendationResponse] = []
    top_repeated_statements: List[RepeatedStatement] = []
    sample_feedbacks: List[FeedbackResponse] = []

    limitations: List[str]
    last_updated: datetime
