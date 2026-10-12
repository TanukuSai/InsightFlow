from typing import List, Dict, Any, Optional
from collections import defaultdict
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, case
from app.models.feedback import Feedback
from app.models.issue import Issue, IssueFeedback
from app.models.dataset import Dataset
from app.core.logging import logger


class IssueService:
    @staticmethod
    async def extract_and_link_issues(
        dataset_id: str,
        workspace_id: str,
        db: AsyncSession,
    ) -> List[Issue]:
        """
        Groups recurring complaints into evidence-linked issues with explicit priority scoring.
        """
        # Fetch feedbacks for dataset
        query = select(Feedback).where(
            Feedback.dataset_id == dataset_id,
            Feedback.workspace_id == workspace_id,
        )
        res = await db.execute(query)
        feedbacks = res.scalars().all()

        if not feedbacks:
            return []

        # Remove existing issues for dataset to allow clean re-clustering
        del_stmt = delete(Issue).where(
            Issue.dataset_id == dataset_id,
            Issue.workspace_id == workspace_id,
        )
        await db.execute(del_stmt)
        await db.flush()

        # Group feedback by primary topic
        topic_groups = defaultdict(list)
        for fb in feedbacks:
            topic = fb.primary_topic or (f"{fb.source_category} Complaints" if fb.source_category else "General Issues")
            topic_groups[topic].append(fb)

        created_issues: List[Issue] = []

        # Cluster and score issues
        for topic, items in topic_groups.items():
            total_supporting = len(items)
            unique_texts = len(set(fb.original_text for fb in items))

            # Derive category from majority
            cat_counts = defaultdict(int)
            for fb in items:
                if fb.source_category:
                    cat_counts[fb.source_category] += 1
            majority_category = max(cat_counts.items(), key=lambda x: x[1])[0] if cat_counts else "General"

            # Determine objective priority and explanation
            if "scam" in topic.lower() or "fraud" in topic.lower() or majority_category == "Fraud and Scam":
                priority = "Critical"
                explanation = "Direct risk of customer financial loss and severe trust erosion. Immediate intervention required."
                title = f"Systemic Risk: {topic}"
                summary = f"Identified {total_supporting} customer reports ({unique_texts} distinct statements) detailing fraudulent interactions and suspicious seller payment demands."
            elif "damage" in topic.lower() or "missing" in topic.lower() or "wrong item" in topic.lower():
                priority = "High"
                explanation = "Direct operational fulfillment failure leading to customer dissatisfaction, returns, and refund costs."
                title = f"Fulfillment Failure: {topic}"
                summary = f"Fulfillment bottlenecks resulting in {total_supporting} complaints regarding damaged packaging and missing order contents."
            elif "crash" in topic.lower() or "stability" in topic.lower():
                priority = "High"
                explanation = "Digital platform crashes prevent orders from completing, directly reducing conversion rates."
                title = f"Platform Reliability: {topic}"
                summary = f"{total_supporting} reports of portal and checkout failures obstructing customer transactions."
            elif "support" in topic.lower() or "delay" in topic.lower():
                priority = "Medium"
                explanation = "Support responsiveness delays amplify customer frustration during escalations."
                title = f"Support Operations: {topic}"
                summary = f"{total_supporting} customers reported delayed ticket handling and unresponsive agent queues."
            else:
                priority = "Low"
                explanation = "General product and usability feedback providing opportunities for iterative optimization."
                title = f"Product Trend: {topic}"
                summary = f"Feedback pattern covering {total_supporting} statements on product features and daily usability."

            issue_id = f"iss-{uuid.uuid4().hex[:12]}"
            issue = Issue(
                id=issue_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                title=title,
                summary=summary,
                category=majority_category,
                priority=priority,
                priority_explanation=explanation,
                status="open",
                is_tracked=False,
                supporting_count=total_supporting,
                unique_supporting_count=unique_texts,
            )
            db.add(issue)
            await db.flush()

            # Create evidence links (sample up to 25 representative feedbacks)
            sample_evidence = items[:25]
            links = [
                IssueFeedback(
                    id=f"ifb-{uuid.uuid4().hex[:12]}",
                    issue_id=issue.id,
                    feedback_id=fb.id,
                    relevance_score=0.95 if fb.sentiment_label == "negative" else 0.80,
                    excerpt=fb.original_text[:160] + ("..." if len(fb.original_text) > 160 else ""),
                )
                for fb in sample_evidence
            ]
            db.add_all(links)
            await db.flush()
            created_issues.append(issue)

        await db.commit()
        return created_issues

    @staticmethod
    async def get_issues_by_dataset(
        dataset_id: str,
        workspace_id: str,
        db: AsyncSession,
    ) -> List[Issue]:
        stmt = (
            select(Issue)
            .where(Issue.dataset_id == dataset_id, Issue.workspace_id == workspace_id)
            .order_by(
                # Order by Critical, High, Medium, Low
                case(
                    (Issue.priority == "Critical", 1),
                    (Issue.priority == "High", 2),
                    (Issue.priority == "Medium", 3),
                    else_=4,
                ),
                Issue.supporting_count.desc(),
            )
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_issue_with_evidence(
        issue_id: str,
        workspace_id: str,
        db: AsyncSession,
    ) -> Optional[Dict[str, Any]]:
        stmt = select(Issue).where(Issue.id == issue_id, Issue.workspace_id == workspace_id)
        res = await db.execute(stmt)
        issue = res.scalar_one_or_none()
        if not issue:
            return None

        # Fetch evidence links with feedback details
        link_stmt = (
            select(IssueFeedback, Feedback)
            .join(Feedback, IssueFeedback.feedback_id == Feedback.id)
            .where(IssueFeedback.issue_id == issue_id)
            .limit(50)
        )
        link_res = await db.execute(link_stmt)
        evidence_rows = link_res.all()

        evidence_list = [
            {
                "feedback_id": fb.id,
                "original_text": fb.original_text,
                "relevance_score": link.relevance_score,
                "excerpt": link.excerpt,
                "source_category": fb.source_category,
                "sentiment_label": fb.sentiment_label,
            }
            for link, fb in evidence_rows
        ]

        return {
            "issue": issue,
            "supporting_evidence": evidence_list,
        }
