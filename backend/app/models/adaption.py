from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AdaptionJob(Base):
    __tablename__ = "adaption_jobs"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"adj-{uuid.uuid4().hex[:12]}",
    )
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dataset_id: Mapped[str] = mapped_column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    adaption_dataset_id: Mapped[str] = mapped_column(String(128), nullable=True)
    adaption_run_id: Mapped[str] = mapped_column(String(128), nullable=True)
    operation_type: Mapped[str] = mapped_column(String(64), default="adapt")  # estimate, adapt, augment, export
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, running, succeeded, failed
    column_mapping: Mapped[dict] = mapped_column(JSON, default=dict)
    job_specification: Mapped[dict] = mapped_column(JSON, default=dict)
    estimated_credits: Mapped[float] = mapped_column(Float, nullable=True)
    estimated_minutes: Mapped[float] = mapped_column(Float, nullable=True)
    result_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
