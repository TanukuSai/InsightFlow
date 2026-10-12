from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Float, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"fb-{uuid.uuid4().hex[:12]}",
    )
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dataset_id: Mapped[str] = mapped_column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_category: Mapped[str] = mapped_column(String(128), index=True, nullable=True)
    source_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    source_identifier: Mapped[str] = mapped_column(String(128), nullable=True)

    # Derived analysis results - NULLABLE until analyzed
    sentiment_label: Mapped[str] = mapped_column(String(32), index=True, nullable=True)
    sentiment_score: Mapped[float] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)
    primary_topic: Mapped[str] = mapped_column(String(128), index=True, nullable=True)
    analysis_status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, analyzed, failed

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    dataset = relationship("Dataset", back_populates="feedbacks")
    issue_links = relationship("IssueFeedback", back_populates="feedback", cascade="all, delete-orphan")


Index("ix_feedback_ws_ds", Feedback.workspace_id, Feedback.dataset_id)
Index("ix_feedback_cat_sentiment", Feedback.source_category, Feedback.sentiment_label)
