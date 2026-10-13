from typing import Dict
from datetime import datetime, timezone
from collections import Counter, defaultdict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, case
from app.api.deps import get_current_user, get_session
from app.core.security import AuthenticatedUser
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.models.issue import Issue
from app.models.recommendation import Recommendation
from app.schemas.dashboard import DashboardResponse, SentimentDistribution, RepeatedStatement
from app.schemas.issue import IssueResponse
from app.schemas.recommendation import RecommendationResponse
from app.schemas.feedback import FeedbackResponse

router = APIRouter()


@router.get("/datasets/{dataset_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard_data(
    dataset_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    # 1. Fetch Dataset strictly scoped to current_user's workspace
    ds_stmt = select(Dataset).where(
        Dataset.id == dataset_id,
        Dataset.workspace_id == current_user.workspace_id,
    )
    dataset = (await db.execute(ds_stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found in workspace",
        )

    # 2. Fetch all valid feedback records
    fb_stmt = select(Feedback).where(
        Feedback.dataset_id == dataset_id,
        Feedback.workspace_id == current_user.workspace_id,
    )
    fb_res = await db.execute(fb_stmt)
    all_feedbacks = fb_res.scalars().all()

    # 3. Denominators & Core Metric Invariants
    valid_count = len(all_feedbacks)
    if dataset.valid_rows is not None and dataset.valid_rows > 0:
        valid_rows = dataset.valid_rows
    else:
        valid_rows = valid_count

    total_source = dataset.row_count if dataset.row_count is not None and dataset.row_count >= valid_rows else valid_rows
    invalid_rows = dataset.invalid_rows if dataset.invalid_rows is not None else max(0, total_source - valid_rows)

    # 4. Sentiment coverage & mix calculation
    sentiment_counter = Counter()
    analyzed_count = 0
    sentiment_score_sum = 0.0

    for fb in all_feedbacks:
        if fb.sentiment_label:
            sentiment_counter[fb.sentiment_label] += 1
            analyzed_count += 1
            if fb.sentiment_score is not None:
                sentiment_score_sum += fb.sentiment_score

    sentiment_dist = None
    avg_sentiment_score = None
    analysis_status = "unanalysed"
    sentiment_coverage_pct = round((analyzed_count / valid_rows) * 100, 1) if valid_rows > 0 else 0.0

    if analyzed_count > 0:
        sentiment_dist = SentimentDistribution(
            positive=sentiment_counter.get("positive", 0),
            neutral=sentiment_counter.get("neutral", 0),
            negative=sentiment_counter.get("negative", 0),
            mixed=sentiment_counter.get("mixed", 0),
            unknown=sentiment_counter.get("unknown", 0),
            total_analyzed=analyzed_count,
            coverage_pct=sentiment_coverage_pct,
        )
        avg_sentiment_score = round(sentiment_score_sum / analyzed_count, 3)
        analysis_status = "completed" if analyzed_count >= valid_rows else "partial"
    elif dataset.status == "analyzing":
        analysis_status = "analyzing"

    # 5. Fetch Issues sorted by Priority heuristic
    issue_stmt = (
        select(Issue)
        .where(
            Issue.dataset_id == dataset_id,
            Issue.workspace_id == current_user.workspace_id,
        )
        .order_by(
            case(
                (Issue.priority == "Critical", 1),
                (Issue.priority == "High", 2),
                (Issue.priority == "Medium", 3),
                else_=4,
            ),
            Issue.supporting_count.desc(),
        )
        .limit(10)
    )
    issue_items = (await db.execute(issue_stmt)).scalars().all()

    # 6. Fetch Recommendations
    rec_stmt = (
        select(Recommendation)
        .where(
            Recommendation.dataset_id == dataset_id,
            Recommendation.workspace_id == current_user.workspace_id,
        )
        .order_by(Recommendation.created_at.desc())
        .limit(10)
    )
    rec_items = (await db.execute(rec_stmt)).scalars().all()

    # 7. Exact-repeat frequency & multi-category resolution
    stmt_counter = Counter()
    stmt_cats = defaultdict(set)
    stmt_ids = defaultdict(list)
    for fb in all_feedbacks:
        stmt_counter[fb.original_text] += 1
        cat = fb.source_category or "Uncategorized"
        stmt_cats[fb.original_text].add(cat)
        if len(stmt_ids[fb.original_text]) < 10:
            stmt_ids[fb.original_text].append(fb.id)

    top_repeated_statements = []
    for text, count in stmt_counter.most_common(5):
        if count > 1:
            cats = stmt_cats[text]
            category_label = "Multiple categories" if len(cats) > 1 else next(iter(cats))
            share_pct = round((count / valid_rows) * 100, 1) if valid_rows > 0 else 0.0
            top_repeated_statements.append(
                RepeatedStatement(
                    statement=text,
                    category=category_label,
                    count=count,
                    extra_duplicates=count - 1,
                    dataset_share_pct=share_pct,
                    sample_feedback_ids=stmt_ids[text],
                )
            )

    distinct_comment_texts = len(stmt_counter)
    extra_duplicate_copies = sum(cnt - 1 for cnt in stmt_counter.values() if cnt > 1)
    comments_in_repeated_groups = sum(cnt for cnt in stmt_counter.values() if cnt > 1)

    category_distribution = dataset.category_distribution or {}
    total_categorized_rows = sum(category_distribution.values())

    # Sample feedbacks in source order
    sample_feedbacks = all_feedbacks[:15]

    return DashboardResponse(
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        total_source_rows=total_source,
        valid_rows=valid_rows,
        valid_feedback_count=valid_rows,
        invalid_rows=invalid_rows,
        invalid_source_rows=invalid_rows,
        unique_exact_statements=distinct_comment_texts,
        distinct_comment_texts=distinct_comment_texts,
        repeated_rows=extra_duplicate_copies,
        extra_duplicate_occurrences=extra_duplicate_copies,
        extra_duplicate_copies=extra_duplicate_copies,
        rows_in_repeated_groups=comments_in_repeated_groups,
        comments_in_repeated_groups=comments_in_repeated_groups,
        total_categorized_rows=total_categorized_rows,
        has_timestamps=False,
        temporal_available=False,
        temporal_message="Dataset does not contain verified timestamp data. Historical trend charts are unavailable.",
        analysis_status=analysis_status,
        analysis_provider="rule-based baseline" if analyzed_count > 0 else None,
        analysis_model="lexicon-rules-v1.0" if analyzed_count > 0 else None,
        sentiment_analyzed_count=analyzed_count,
        sentiment_coverage_pct=sentiment_coverage_pct,
        source_category_distribution=category_distribution,
        sentiment_distribution=sentiment_dist,
        average_sentiment_score=avg_sentiment_score,
        top_recurring_issues=[IssueResponse.model_validate(iss) for iss in issue_items],
        top_recommendations=[RecommendationResponse.model_validate(rec) for rec in rec_items],
        top_repeated_statements=top_repeated_statements,
        sample_feedbacks=[FeedbackResponse.model_validate(fb) for fb in sample_feedbacks],
        limitations=[
            "Source category information is strictly distinct from derived sentiment.",
            "Historical temporal trend graphs are withheld because source rows lack verified timestamps.",
            "Repeated exact statements are counted distinctly to avoid conflating message duplication with separate customers.",
            "Sentiment is estimated using a rule-based keyword heuristic and serves as a directional scan, not ground truth.",
        ],
        last_updated=datetime.now(timezone.utc),
    )
