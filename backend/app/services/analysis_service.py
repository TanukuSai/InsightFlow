import re
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from collections import Counter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.models.analysis import AnalysisJob
from app.core.logging import logger


# High-precision domain lexicon for sentiment & recurring issue patterns
POSITIVE_LEXICON = {
    "great", "excellent", "love", "awesome", "fantastic", "good", "perfect",
    "helpful", "innovative", "useful", "satisfied", "friendly", "prompt",
    "easy", "smooth", "impressed", "wonderful", "fast", "reliable", "best"
}

NEGATIVE_LEXICON = {
    "scam", "fraud", "damaged", "broken", "missing", "crash", "crashing",
    "worst", "poor", "unresponsive", "delay", "delayed", "wrong", "incorrect",
    "terrible", "horrible", "awful", "failed", "bug", "glitch", "frustrated",
    "stolen", "unacceptable", "useless", "slow", "error", "complaint", "rude"
}

TOPIC_PATTERNS = [
    (r"scam|fraud|fake|phishing|additional payment", "Fraud & Payment Scams"),
    (r"damaged|broken|packaging|crushed|opened", "Damaged Packaging"),
    (r"missing|wrong item|incorrect items|omitted", "Order Fulfillment & Missing Items"),
    (r"crash|crashing|bug|error|freeze|slow website|website down", "Website & App Stability"),
    (r"unresponsive|no response|customer service|support team|rude|agent", "Customer Support Delays"),
    (r"innovative|useful|great features|sleek|daily needs|love", "Product Usability & Features"),
    (r"delivery|shipping|late|carrier|transit", "Shipping & Delivery Delays"),
]


class AnalysisProvider:
    """
    Modular analysis provider implementing sentiment scoring and topic classification.
    """
    def __init__(self, provider_name: str = "hybrid-nlp", model_name: str = "v1.0-balanced"):
        self.provider_name = provider_name
        self.model_name = model_name

    def classify_sentiment(self, text: str) -> Tuple[str, float, float]:
        """
        Classifies sentiment into explicit taxonomy:
        positive, neutral, negative, mixed, unknown.
        Returns (label, score [-1.0 to 1.0], confidence [0.0 to 1.0]).
        """
        lower = text.lower()
        words = set(re.findall(r"\b\w+\b", lower))

        pos_matches = words.intersection(POSITIVE_LEXICON)
        neg_matches = words.intersection(NEGATIVE_LEXICON)

        pos_count = len(pos_matches)
        neg_count = len(neg_matches)

        if pos_count > 0 and neg_count > 0:
            if pos_count == neg_count:
                return "mixed", 0.0, 0.75
            elif pos_count > neg_count:
                score = round((pos_count - neg_count) / (pos_count + neg_count), 2)
                return "positive", score, 0.82
            else:
                score = round(-(neg_count - pos_count) / (pos_count + neg_count), 2)
                return "negative", score, 0.85

        if neg_count > 0:
            # Calibrate score and confidence based on intensity
            score = max(-1.0, round(-0.4 - (neg_count * 0.15), 2))
            confidence = min(0.96, round(0.78 + (neg_count * 0.05), 2))
            return "negative", score, confidence

        if pos_count > 0:
            score = min(1.0, round(0.4 + (pos_count * 0.15), 2))
            confidence = min(0.95, round(0.78 + (pos_count * 0.05), 2))
            return "positive", score, confidence

        # Inconclusive / informational statements
        if len(words) < 3:
            return "unknown", 0.0, 0.50
        return "neutral", 0.0, 0.70

    def extract_topic(self, text: str, source_category: Optional[str] = None) -> str:
        """
        Extracts primary topic based on semantic keyword patterns.
        """
        lower = text.lower()
        for pattern, topic in TOPIC_PATTERNS:
            if re.search(pattern, lower):
                return topic

        # Fallback to category if aligned, or General Feedback
        if source_category and source_category != "Uncategorized":
            return f"{source_category} Topic"
        return "General Feedback"


class AnalysisService:
    @staticmethod
    async def run_dataset_analysis(
        dataset_id: str,
        workspace_id: str,
        job_id: str,
        db: AsyncSession,
        sample_size: Optional[int] = None,
        provider_name: str = "hybrid-nlp",
        model_name: str = "v1.0-balanced",
    ) -> AnalysisJob:
        # Fetch Job
        job_stmt = select(AnalysisJob).where(
            AnalysisJob.id == job_id,
            AnalysisJob.workspace_id == workspace_id,
        )
        res = await db.execute(job_stmt)
        job = res.scalar_one_or_none()
        if not job:
            raise ValueError(f"Analysis job {job_id} not found")

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        await db.commit()

        provider = AnalysisProvider(provider_name=provider_name, model_name=model_name)

        # Query all feedback records for dataset
        query = select(Feedback).where(
            Feedback.dataset_id == dataset_id,
            Feedback.workspace_id == workspace_id,
        )
        if sample_size and sample_size > 0:
            query = query.limit(sample_size)

        fb_result = await db.execute(query)
        feedbacks = fb_result.scalars().all()

        total = len(feedbacks)
        job.total_items = total

        sentiment_counts = Counter()
        topic_counts = Counter()
        score_sum = 0.0
        analyzed_count = 0

        # Process in batches for performance
        batch_size = 500
        for i in range(0, total, batch_size):
            chunk = feedbacks[i : i + batch_size]
            for fb in chunk:
                label, score, conf = provider.classify_sentiment(fb.original_text)
                topic = provider.extract_topic(fb.original_text, fb.source_category)

                fb.sentiment_label = label
                fb.sentiment_score = score
                fb.confidence_score = conf
                fb.primary_topic = topic
                fb.analysis_status = "analyzed"

                sentiment_counts[label] += 1
                topic_counts[topic] += 1
                score_sum += score
                analyzed_count += 1

            job.processed_items = analyzed_count
            job.success_count = analyzed_count
            await db.flush()

        avg_score = round(score_sum / analyzed_count, 3) if analyzed_count > 0 else 0.0

        job.status = "succeeded"
        job.completed_at = datetime.now(timezone.utc)
        job.metrics = {
            "sentiment_distribution": dict(sentiment_counts),
            "top_topics": dict(topic_counts.most_common(10)),
            "average_sentiment_score": avg_score,
            "taxonomy_version": "v1.0-standard",
        }

        # Update dataset status
        dataset_stmt = select(Dataset).where(Dataset.id == dataset_id)
        ds_res = await db.execute(dataset_stmt)
        dataset = ds_res.scalar_one_or_none()
        if dataset:
            dataset.status = "analyzed"

        await db.commit()
        await db.refresh(job)
        return job
