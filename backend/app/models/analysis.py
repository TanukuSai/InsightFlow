from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"aj-{uuid.uuid4().hex[:12]}",
    )
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dataset_id: Mapped[str] = mapped_column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="queued")  # queued, running, succeeded, failed
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    processed_items: Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    provider: Mapped[str] = mapped_column(String(64), default="insightflow-nlp")
    model: Mapped[str] = mapped_column(String(64), default="v1.0-hybrid")
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    dataset = relationship("Dataset", back_populates="analysis_jobs")
