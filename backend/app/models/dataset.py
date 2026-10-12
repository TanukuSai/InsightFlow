from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Integer, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"ds-{uuid.uuid4().hex[:12]}",
    )
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    invalid_rows: Mapped[int] = mapped_column(Integer, default=0)
    unique_feedback_count: Mapped[int] = mapped_column(Integer, default=0)
    repeat_feedback_count: Mapped[int] = mapped_column(Integer, default=0)
    category_distribution: Mapped[dict] = mapped_column(JSON, default=dict)
    has_timestamps: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32), default="imported")  # imported, analyzing, analyzed, failed
    error_summary: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    feedbacks = relationship("Feedback", back_populates="dataset", cascade="all, delete-orphan")
    analysis_jobs = relationship("AnalysisJob", back_populates="dataset", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="dataset", cascade="all, delete-orphan")
