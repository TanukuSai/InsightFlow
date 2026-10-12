from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AdaptionDailyQuota(Base):
    __tablename__ = "adaption_daily_quotas"

    # Primary key is the UTC date string: 'YYYY-MM-DD'
    date_str: Mapped[str] = mapped_column(String(16), primary_key=True)
    estimate_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    run_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
