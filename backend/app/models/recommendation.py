from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"rec-{uuid.uuid4().hex[:12]}",
    )
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    issue_id: Mapped[str] = mapped_column(String(64), ForeignKey("issues.id", ondelete="CASCADE"), index=True, nullable=False)
    dataset_id: Mapped[str] = mapped_column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    expected_benefit: Mapped[str] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(32), default="High")
    status: Mapped[str] = mapped_column(String(32), default="proposed")  # proposed, in_progress, implemented, dismissed
    is_tracked: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    issue = relationship("Issue", back_populates="recommendations")
