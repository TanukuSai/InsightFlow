from __future__ import annotations
import csv
import os
import uuid
from typing import Optional
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.workspace import Workspace
from app.models.user import User
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.models.analysis import AnalysisJob
from app.core.config import settings
from app.core.logging import logger
from app.core.security import hash_password, normalize_email
from app.services.analysis_service import AnalysisProvider
from app.services.issue_service import IssueService
from app.services.recommendation_service import RecommendationService


def resolve_canonical_csv_path() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent.parent.parent / "data" / "BuildBattle_2026_Customer_Feedback_Dataset.csv",
        Path(__file__).resolve().parent.parent.parent / "data" / "BuildBattle_2026_Customer_Feedback_Dataset.csv",
        Path("data/BuildBattle_2026_Customer_Feedback_Dataset.csv").resolve(),
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            return p
    return candidates[0]


async def seed_canonical_dataset_if_needed(db: AsyncSession, workspace_id: Optional[str] = None):
    """
    Idempotently seeds the canonical customer feedback dataset, feedback records,
    rule-based baseline analysis, issue dossiers, recommendations, and evaluator user account
    into a fresh or unseeded database.
    """
    target_ws_id = workspace_id or settings.PUBLIC_DEMO_WORKSPACE_ID

    # Ensure Workspace exists
    ws_stmt = select(Workspace).where(Workspace.id == target_ws_id)
    ws_res = await db.execute(ws_stmt)
    if not ws_res.scalar_one_or_none():
        ws = Workspace(
            id=target_ws_id,
            name="Customer Intelligence Workspace",
            created_at=datetime.now(timezone.utc),
        )
        db.add(ws)
        await db.flush()

    # Ensure canonical evaluator user exists
    eval_email = normalize_email("evaluator@insightflow.local")
    user_stmt = select(User).where(User.email == eval_email)
    user_res = await db.execute(user_stmt)
    existing_user = user_res.scalar_one_or_none()
    if not existing_user:
        eval_user = User(
            id="usr-evaluator-seed",
            email=eval_email,
            hashed_password=hash_password("f#6O6&BzM$8he*!q"),
            full_name="Build Battle Evaluator",
            workspace_id=target_ws_id,
            role="owner",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(eval_user)
        await db.commit()
        logger.info("Seeded canonical evaluator account: evaluator@insightflow.local")

    stmt = select(Dataset).where(Dataset.id == settings.CANONICAL_DATASET_ID)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        logger.debug(f"Canonical dataset '{settings.CANONICAL_DATASET_ID}' already exists. Seeding skipped.")
        return

    csv_path = resolve_canonical_csv_path()
    if not csv_path.exists():
        logger.warning(f"Canonical seed CSV not found at {csv_path}. Skipping automatic seed.")
        return

    logger.info(f"Seeding canonical dataset from {csv_path} into workspace {target_ws_id}...")

    # Read and parse CSV
    raw_records = []
    text_counter = Counter()
    category_counter = Counter()

    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return

        clean_header = [h.strip().lower() for h in header]
        review_idx = 0
        cat_idx = 1
        for idx, col in enumerate(clean_header):
            if col in ["review", "feedback", "text"]:
                review_idx = idx
            elif col in ["category", "source_category"]:
                cat_idx = idx

        for row in reader:
            if not row:
                continue
            text = row[review_idx].strip() if review_idx < len(row) else ""
            category = row[cat_idx].strip() if cat_idx < len(row) else "Uncategorized"
            if not text:
                continue
            text_counter[text] += 1
            category_counter[category] += 1
            raw_records.append((text, category))

    total_count = len(raw_records)
    unique_count = len(text_counter)
    repeated_count = total_count - unique_count

    # 1. Create canonical Dataset entity
    dataset = Dataset(
        id=settings.CANONICAL_DATASET_ID,
        workspace_id=target_ws_id,
        name="Customer Feedback Sample",
        original_filename="BuildBattle_2026_Customer_Feedback_Dataset.csv",
        row_count=total_count,
        valid_rows=total_count,
        invalid_rows=0,
        unique_feedback_count=unique_count,
        repeat_feedback_count=repeated_count,
        category_distribution=dict(category_counter),
        has_timestamps=False,
        status="analyzed",
    )
    db.add(dataset)
    await db.flush()

    # 2. Insert Feedbacks with rule-based baseline classification
    provider = AnalysisProvider(provider_name="rule-based baseline", model_name="lexicon-rules-v1.0")
    sentiment_counts = Counter()
    topic_counts = Counter()
    score_sum = 0.0

    batch_size = 1000
    for i in range(0, total_count, batch_size):
        chunk = raw_records[i : i + batch_size]
        feedback_objs = []
        for text, category in chunk:
            label, score, conf = provider.classify_sentiment(text)
            topic = provider.extract_topic(text, category)
            sentiment_counts[label] += 1
            topic_counts[topic] += 1
            score_sum += score

            fb = Feedback(
                id=f"fb-{uuid.uuid4().hex[:12]}",
                workspace_id=target_ws_id,
                dataset_id=dataset.id,
                original_text=text,
                source_category=category,
                sentiment_label=label,
                sentiment_score=score,
                confidence_score=conf,
                primary_topic=topic,
                analysis_status="analyzed",
            )
            feedback_objs.append(fb)
        db.add_all(feedback_objs)
        await db.flush()

    avg_score = round(score_sum / total_count, 3) if total_count > 0 else 0.0

    # 3. Create precomputed AnalysisJob record
    analysis_job = AnalysisJob(
        id=f"aj-{uuid.uuid4().hex[:12]}",
        workspace_id=target_ws_id,
        dataset_id=dataset.id,
        status="succeeded",
        total_items=total_count,
        processed_items=total_count,
        success_count=total_count,
        provider="rule-based baseline",
        model="lexicon-rules-v1.0",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        metrics={
            "sentiment_distribution": dict(sentiment_counts),
            "top_topics": dict(topic_counts.most_common(10)),
            "average_sentiment_score": avg_score,
            "taxonomy_version": "v1.0-standard",
        },
    )
    db.add(analysis_job)
    await db.flush()

    # 4. Extract and link issues and recommendations
    logger.info("Extracting issue dossiers and generating recommendations for seeded dataset...")
    issues = await IssueService.extract_and_link_issues(
        dataset_id=dataset.id,
        workspace_id=target_ws_id,
        db=db,
    )
    await RecommendationService.generate_recommendations_for_issues(
        dataset_id=dataset.id,
        workspace_id=target_ws_id,
        issues=issues,
        db=db,
    )

    await db.commit()
    logger.info(f"Canonical demo dataset seeded successfully: {total_count} records, {len(issues)} issue dossiers.")
