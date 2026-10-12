from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.adaption_quota import AdaptionDailyQuota
from app.core.config import settings
from app.core.logging import logger


class AdaptionQuotaService:
    @staticmethod
    def get_utc_today_str() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    @staticmethod
    def get_seconds_until_utc_midnight() -> int:
        now = datetime.now(timezone.utc)
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return max(1, int((tomorrow - now).total_seconds()))

    @staticmethod
    async def get_or_create_quota(db: AsyncSession, date_str: str) -> AdaptionDailyQuota:
        stmt = select(AdaptionDailyQuota).where(AdaptionDailyQuota.date_str == date_str).with_for_update()
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            record = AdaptionDailyQuota(date_str=date_str, estimate_count=0, run_count=0)
            db.add(record)
            await db.flush()
        return record

    @staticmethod
    async def get_quota_summary(db: AsyncSession) -> Dict[str, Any]:
        today_str = AdaptionQuotaService.get_utc_today_str()
        stmt = select(AdaptionDailyQuota).where(AdaptionDailyQuota.date_str == today_str)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        est_used = record.estimate_count if record else 0
        run_used = record.run_count if record else 0
        return {
            "daily_estimates_remaining": max(0, settings.ADAPTION_DAILY_ESTIMATE_LIMIT - est_used),
            "daily_runs_remaining": max(0, settings.ADAPTION_DAILY_RUN_LIMIT - run_used),
            "daily_estimates_limit": settings.ADAPTION_DAILY_ESTIMATE_LIMIT,
            "daily_runs_limit": settings.ADAPTION_DAILY_RUN_LIMIT,
        }

    @staticmethod
    async def reserve_quota(db: AsyncSession, operation: str) -> None:
        """
        Atomically reserve a quota unit before calling external provider.
        operation: 'estimate' or 'run'
        Raises HTTPException(429) if exhausted.
        """
        today_str = AdaptionQuotaService.get_utc_today_str()
        retry_after = AdaptionQuotaService.get_seconds_until_utc_midnight()

        record = await AdaptionQuotaService.get_or_create_quota(db, today_str)

        if operation == "estimate":
            if record.estimate_count >= settings.ADAPTION_DAILY_ESTIMATE_LIMIT:
                logger.warning(f"Adaption estimate quota reached for UTC date {today_str} ({record.estimate_count}/{settings.ADAPTION_DAILY_ESTIMATE_LIMIT})")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Daily quota reached: maximum {settings.ADAPTION_DAILY_ESTIMATE_LIMIT} estimate requests allowed per day. Resets at 00:00 UTC.",
                    headers={"Retry-After": str(retry_after)},
                )
            record.estimate_count += 1
        elif operation == "run":
            if record.run_count >= settings.ADAPTION_DAILY_RUN_LIMIT:
                logger.warning(f"Adaption run quota reached for UTC date {today_str} ({record.run_count}/{settings.ADAPTION_DAILY_RUN_LIMIT})")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Daily quota reached: maximum {settings.ADAPTION_DAILY_RUN_LIMIT} adaptation runs allowed per day. Resets at 00:00 UTC.",
                    headers={"Retry-After": str(retry_after)},
                )
            record.run_count += 1

        db.add(record)
        await db.commit()
