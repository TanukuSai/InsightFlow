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

NEGATION_TOKENS = {
    "not", "no", "never", "n't", "hardly", "barely", "scarcely",
    "cannot", "wasn't", "isn't", "didn't", "won't", "doesn't", "without"
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
    Transparent rule-based baseline analysis provider implementing lexicon matching,
    negation resolution, and regex topic classification without fabricating probability confidence.
    """
    def __init__(self, provider_name: str = "rule-based baseline", model_name: str = "lexicon-rules-v1.0"):
        self.provider_name = provider_name
        self.model_name = model_name

    def classify_sentiment(self, text: Optional[str]) -> Tuple[str, float, Optional[float]]:
        """
        Classifies sentiment into explicit taxonomy:
        positive, neutral, negative, mixed, unknown.
        Returns (label, score [-1.0 to 1.0], confidence).
        Note: Confidence is returned as None because rule-based heuristics do not produce
        empirically calibrated probabilities.
        """
        if not text or not text.strip():
            return "unknown", 0.0, None

        cleaned = text.strip()
        lower = cleaned.lower()
        tokens = re.findall(r"\b\w+(?:'\w+)?\b", lower)

        if len(tokens) < 2 and len(cleaned) < 4:
            return "unknown", 0.0, None

        # Sarcasm / irony heuristic check
        sarcasm_indicators = [
            r"oh great,\s*(?:another|the)?\s*(?:crash|bug|scam|delay)",
            r"wonderful,\s*(?:another|the)?\s*(?:crash|bug|error|scam)",
            r"just what i needed,\s*(?:a|another)?\s*(?:broken|damaged|delay)",
        ]
        for pattern in sarcasm_indicators:
            if re.search(pattern, lower):
                return "unknown", 0.0, None

        # Contrastive clauses (e.g., "They claim it's innovative but it fails constantly")
        if " but " in lower or " however " in lower or " yet " in lower:
            parts = re.split(r"\b(?:but|however|yet)\b", lower, maxsplit=1)
            if len(parts) == 2 and parts[1].strip():
                # Primary sentiment is weighted towards the post-contrast clause
                contrast_tokens = re.findall(r"\b\w+(?:'\w+)?\b", parts[1])
                contrast_pos = sum(1 for w in contrast_tokens if w in POSITIVE_LEXICON)
                contrast_neg = sum(1 for w in contrast_tokens if w in NEGATIVE_LEXICON)
                if contrast_neg > contrast_pos:
                    return "negative", -0.75, None
                elif contrast_pos > contrast_neg:
                    return "positive", 0.75, None

        # Token analysis with window-based negation handling (window of up to 2 preceding tokens)
        pos_count = 0
        neg_count = 0

        for i, word in enumerate(tokens):
            is_negated = False
            # Check previous 2 tokens for negation
            for prev_idx in range(max(0, i - 2), i):
                prev_token = tokens[prev_idx]
                if prev_token in NEGATION_TOKENS or prev_token.endswith("n't"):
                    is_negated = True
                    break

            if word in POSITIVE_LEXICON:
                if is_negated:
                    # "not good", "never helpful" -> inverted to negative signal
                    neg_count += 1
                else:
                    pos_count += 1
            elif word in NEGATIVE_LEXICON:
                if is_negated:
                    # "not a scam", "not broken", "no complaints" -> neutralized / positive leaning
                    pos_count += 0.5
                else:
                    neg_count += 1

        if pos_count > 0 and neg_count > 0:
            if abs(pos_count - neg_count) < 0.5:
                return "mixed", 0.0, None
            elif pos_count > neg_count:
                score = round((pos_count - neg_count) / (pos_count + neg_count), 2)
                return "positive", score, None
            else:
                score = round(-(neg_count - pos_count) / (pos_count + neg_count), 2)
                return "negative", score, None

        if neg_count > 0:
            score = max(-1.0, round(-0.4 - (neg_count * 0.15), 2))
            return "negative", score, None

        if pos_count > 0:
            score = min(1.0, round(0.4 + (pos_count * 0.15), 2))
            return "positive", score, None

        # Informational / neutral statements
        if len(tokens) <= 2:
            return "unknown", 0.0, None
        return "neutral", 0.0, None

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
        provider_name: str = "rule-based baseline",
        model_name: str = "lexicon-rules-v1.0",
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
        job.provider = provider_name
        job.model = model_name
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
