from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"iss-{uuid.uuid4().hex[:12]}",
    )
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dataset_id: Mapped[str] = mapped_column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(32), index=True, default="Medium")  # Critical, High, Medium, Low
    priority_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="open")  # open, investigating, resolved, dismissed
    is_tracked: Mapped[bool] = mapped_column(Boolean, default=False)
    supporting_count: Mapped[int] = mapped_column(Integer, default=0)
    unique_supporting_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    dataset = relationship("Dataset", back_populates="issues")
    feedback_links = relationship("IssueFeedback", back_populates="issue", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="issue", cascade="all, delete-orphan")


class IssueFeedback(Base):
    __tablename__ = "issue_feedback"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"ifb-{uuid.uuid4().hex[:12]}",
    )
    issue_id: Mapped[str] = mapped_column(String(64), ForeignKey("issues.id", ondelete="CASCADE"), index=True, nullable=False)
    feedback_id: Mapped[str] = mapped_column(String(64), ForeignKey("feedbacks.id", ondelete="CASCADE"), index=True, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=1.0)
    excerpt: Mapped[str] = mapped_column(Text, nullable=True)
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    issue = relationship("Issue", back_populates="feedback_links")
    feedback = relationship("Feedback", back_populates="issue_links")


Index("ix_issue_ws_ds", Issue.workspace_id, Issue.dataset_id)
Index("ix_issue_prio_status", Issue.priority, Issue.status)
