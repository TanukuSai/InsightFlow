import time
from collections import defaultdict, deque
from typing import Dict, Deque
from fastapi import Request, HTTPException, status
from app.core.config import settings
from app.core.logging import logger


class InMemoryRateLimiter:
    """
    Lightweight, in-process sliding-window rate limiter for public hackathon endpoints.
    Protects mutation and expensive computational endpoints from unbounded calls.
    """
    def __init__(self):
        # Maps (client_ip, scope) -> deque of request timestamps
        self._records: Dict[tuple, Deque[float]] = defaultdict(deque)

    def get_client_ip(self, request: Request) -> str:
        # Check standard headers if behind trusted proxy, otherwise fall back to client.host
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # First IP in X-Forwarded-For is client
            client_ip = forwarded.split(",")[0].strip()
            if client_ip:
                return client_ip

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

        if request.client and request.client.host:
            return request.client.host

        return "127.0.0.1"

    def check(self, request: Request, scope: str, max_requests: int, window_seconds: int):
        now = time.time()
        client_ip = self.get_client_ip(request)
        key = (client_ip, scope)
        timestamps = self._records[key]

        # Evict timestamps outside sliding window
        cutoff = now - window_seconds
        while timestamps and timestamps[0] <= cutoff:
            timestamps.popleft()

        if len(timestamps) >= max_requests:
            retry_after = max(1, int(window_seconds - (now - timestamps[0])))
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on scope '{scope}'. Limit: {max_requests}/{window_seconds}s. Retry-After: {retry_after}s"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {scope}. Please retry in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

        timestamps.append(now)

    def reset(self):
        """Used in test environments to clear state."""
        self._records.clear()


limiter = InMemoryRateLimiter()


def rate_limit_import(request: Request):
    limiter.check(
        request=request,
        scope="csv-import",
        max_requests=settings.RATE_LIMIT_IMPORTS_PER_HOUR,
        window_seconds=3600,
    )


def rate_limit_analysis(request: Request):
    limiter.check(
        request=request,
        scope="analysis-start",
        max_requests=settings.RATE_LIMIT_ANALYSIS_PER_10MIN,
        window_seconds=600,
    )


def rate_limit_report(request: Request):
    limiter.check(
        request=request,
        scope="report-generation",
        max_requests=settings.RATE_LIMIT_REPORTS_PER_HOUR,
        window_seconds=3600,
    )


def rate_limit_feedback(request: Request):
    limiter.check(
        request=request,
        scope="manual-feedback",
        max_requests=settings.RATE_LIMIT_FEEDBACK_PER_HOUR,
        window_seconds=3600,
    )


def rate_limit_adaption(request: Request):
    limiter.check(
        request=request,
        scope="adaption-operations",
        max_requests=settings.RATE_LIMIT_ADAPTION_PER_HOUR,
        window_seconds=3600,
    )


def rate_limit_burst(request: Request):
    limiter.check(
        request=request,
        scope="burst-reads",
        max_requests=settings.RATE_LIMIT_BURST_PER_MINUTE,
        window_seconds=60,
    )
