from datetime import datetime, timezone
import uuid
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"rep-{uuid.uuid4().hex[:12]}",
    )
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dataset_id: Mapped[str] = mapped_column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(16), default="pdf")  # pdf, json, csv
    file_path: Mapped[str] = mapped_column(String(512), nullable=True)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    summary_data: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="ready")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
