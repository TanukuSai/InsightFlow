from typing import List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.issue import Issue
from app.models.recommendation import Recommendation


RECOMMENDATION_TEMPLATES = {
    "Fraud & Payment Scams": {
        "action": "Implement strict seller vetting and automate payment anomaly detection for off-platform payment solicitations.",
        "rationale": "Direct reports indicate sellers demand unverified payments after order placement, indicating account compromise or malicious vendor onboarding.",
        "expected_benefit": "Hypothesis to validate: Potential reduction in reported off-platform payment solicitations upon tightening vendor onboarding.",
        "priority": "Critical",
    },
    "Damaged Packaging": {
        "action": "Audit warehouse packaging protocols and mandate transit-grade cushioning for vulnerable SKUs.",
        "rationale": "High recurrence of crushed and opened parcels suggests inadequate parcel packing standards at regional fulfillment hubs.",
        "expected_benefit": "Hypothesis to validate: Potential decrease in damaged packaging claims if transit cushioning standards are improved.",
        "priority": "High",
    },
    "Order Fulfillment & Missing Items": {
        "action": "Deploy barcode-scan verification before parcel sealing to eliminate item omission errors.",
        "rationale": "Customer complaints consistently point to omitted or incorrectly dispatched items, pointing to manual pick-and-pack errors.",
        "expected_benefit": "Hypothesis to validate: Potential reduction in omitted item complaints through packing verification steps.",
        "priority": "High",
    },
    "Website & App Stability": {
        "action": "Conduct load profiling on the checkout pipeline and resolve client-side state crashes during high-traffic windows.",
        "rationale": "Shoppers report application termination and order submission crashes during checkout.",
        "expected_benefit": "Hypothesis to validate: Potential reduction in checkout disruption reports upon resolving stability bottlenecks.",
        "priority": "High",
    },
    "Customer Support Delays": {
        "action": "Implement priority routing for fraud and delivery complaints with an SLA target under 2 hours.",
        "rationale": "Prolonged response times compound customer anxiety when dealing with lost or stolen orders.",
        "expected_benefit": "Hypothesis to validate: Potential decrease in queue times and faster triage response for urgent issues.",
        "priority": "Medium",
    },
}


class RecommendationService:
    @staticmethod
    async def generate_recommendations_for_issues(
        dataset_id: str,
        workspace_id: str,
        issues: List[Issue],
        db: AsyncSession,
    ) -> List[Recommendation]:
        # Delete existing recommendations for dataset
        del_stmt = delete(Recommendation).where(
            Recommendation.dataset_id == dataset_id,
            Recommendation.workspace_id == workspace_id,
        )
        await db.execute(del_stmt)
        await db.flush()

        recommendations: List[Recommendation] = []
        for issue in issues:
            template = None
            for key, val in RECOMMENDATION_TEMPLATES.items():
                if key.lower() in issue.title.lower() or key.lower() in issue.category.lower():
                    template = val
                    break

            if not template:
                template = {
                    "action": f"Conduct a root-cause investigation into complaints regarding {issue.category}.",
                    "rationale": f"Issue exhibits {issue.supporting_count} customer reports requiring targeted operational review.",
                    "expected_benefit": f"Hypothesis to validate: Targeted operational review to identify underlying factors and reduce similar {issue.category} complaints.",
                    "priority": issue.priority,
                }

            rec = Recommendation(
                id=f"rec-{uuid.uuid4().hex[:12]}",
                workspace_id=workspace_id,
                issue_id=issue.id,
                dataset_id=dataset_id,
                action=template["action"],
                rationale=template["rationale"],
                expected_benefit=template["expected_benefit"],
                priority=template["priority"],
                status="proposed",
                is_tracked=False,
            )
            db.add(rec)
            recommendations.append(rec)

        await db.commit()
        return recommendations

    @staticmethod
    async def get_recommendations_by_dataset(
        dataset_id: str,
        workspace_id: str,
        db: AsyncSession,
    ) -> List[Recommendation]:
        stmt = (
            select(Recommendation)
            .where(
                Recommendation.dataset_id == dataset_id,
                Recommendation.workspace_id == workspace_id,
            )
            .order_by(Recommendation.created_at.desc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())
