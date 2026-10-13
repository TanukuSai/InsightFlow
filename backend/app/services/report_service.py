import os
import json
import csv
import html
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.dataset import Dataset
from app.models.report import Report
from app.services.issue_service import IssueService
from app.services.recommendation_service import RecommendationService
from app.core.config import settings
from app.core.logging import logger

# ReportLab imports for professional PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


class ReportService:
    @staticmethod
    async def generate_report(
        dataset_id: str,
        workspace_id: str,
        title: Optional[str],
        export_format: str,
        db: AsyncSession,
    ) -> Report:
        # Fetch Dataset
        ds_stmt = select(Dataset).where(
            Dataset.id == dataset_id,
            Dataset.workspace_id == workspace_id,
        )
        res = await db.execute(ds_stmt)
        dataset = res.scalar_one_or_none()
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")

        # Fetch Issues & Recommendations
        issues = await IssueService.get_issues_by_dataset(dataset_id, workspace_id, db)
        recommendations = await RecommendationService.get_recommendations_by_dataset(dataset_id, workspace_id, db)

        # Build comprehensive summary payload
        report_title = title or f"InsightFlow Executive Intelligence Report: {dataset.name}"
        report_id = f"rep-{uuid.uuid4().hex[:12]}"

        # Calculate sentiment stats from feedbacks
        from app.models.feedback import Feedback
        fb_stmt = select(Feedback).where(
            Feedback.dataset_id == dataset_id,
            Feedback.workspace_id == workspace_id,
        )
        fb_res = await db.execute(fb_stmt)
        feedbacks = fb_res.scalars().all()

        sentiment_counts = {}
        analyzed_count = 0
        for fb in feedbacks:
            if fb.sentiment_label:
                sentiment_counts[fb.sentiment_label] = sentiment_counts.get(fb.sentiment_label, 0) + 1
                analyzed_count += 1

        valid_rows = dataset.valid_rows if dataset.valid_rows is not None else len(feedbacks)
        coverage_pct = round((analyzed_count / valid_rows) * 100, 1) if valid_rows > 0 else 0.0

        summary_payload = {
            "report_id": report_id,
            "dataset_id": dataset.id,
            "dataset_name": dataset.name,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_statistics": {
                "total_source_rows": dataset.row_count,
                "valid_feedback_records": valid_rows,
                "invalid_excluded_rows": dataset.invalid_rows,
                "distinct_exact_comment_texts": dataset.unique_feedback_count,
                "extra_duplicate_occurrences": dataset.repeat_feedback_count,
                "has_timestamps": dataset.has_timestamps,
                # compatibility keys
                "total_rows": dataset.row_count,
                "valid_rows": valid_rows,
                "invalid_rows": dataset.invalid_rows,
                "unique_statements": dataset.unique_feedback_count,
                "repeated_rows": dataset.repeat_feedback_count,
            },
            "category_distribution": dataset.category_distribution or {},
            "sentiment_summary": {
                "sentiment_distribution": sentiment_counts if sentiment_counts else {},
                "sentiment_analyzed_count": analyzed_count,
                "sentiment_coverage_pct": coverage_pct,
                "estimation_method": "Rule-based lexicon and pattern heuristic (directional estimate, not calibrated model)",
            },
            "sentiment_distribution": sentiment_counts if sentiment_counts else "Analysis not yet executed",
            "top_issues": [
                {
                    "title": iss.title,
                    "category": iss.category,
                    "priority": iss.priority,
                    "supporting_count": iss.supporting_count,
                    "unique_supporting_count": iss.unique_supporting_count,
                    "summary": iss.summary,
                    "priority_explanation": iss.priority_explanation,
                }
                for iss in issues
            ],
            "actionable_recommendations": [
                {
                    "action": rec.action,
                    "rationale": rec.rationale,
                    "expected_benefit": rec.expected_benefit,
                    "priority": rec.priority,
                }
                for rec in recommendations
            ],
            "methodology_and_limitations": [
                "Source categories represent original CSV tags and are strictly distinct from derived sentiment.",
                "Tone is estimated using a rule-based lexicon and pattern heuristic for directional scanning, not a calibrated model or ground truth.",
                "Dataset does not provide valid timestamps; trend graphs are withheld to preserve data fidelity.",
                "Extra duplicate occurrences measure identical phrasing in source rows and do not represent verified unique customer counts.",
            ],
        }

        # Generate output file according to format
        file_path = os.path.join(settings.REPORTS_DIR, f"{report_id}.{export_format}")

        if export_format == "json":
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(summary_payload, f, indent=2)

        elif export_format == "csv":
            with open(file_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["Section", "Item Title / Metric", "Value / Detail", "Priority / Category"])
                writer.writerow(["Metadata", "Dataset Name", dataset.name, ""])
                writer.writerow(["Metadata", "Total Source Rows", str(dataset.row_count), ""])
                writer.writerow(["Metadata", "Valid Feedback Records", str(dataset.valid_rows), ""])
                writer.writerow(["Metadata", "Excluded / Invalid Rows", str(dataset.invalid_rows), ""])
                writer.writerow(["Metadata", "Distinct Exact Comment Texts", str(dataset.unique_feedback_count), ""])
                writer.writerow(["Metadata", "Extra Duplicate Occurrences", str(dataset.repeat_feedback_count), ""])
                writer.writerow(["Metadata", "Timestamp Availability", "Unavailable (CSV standard)", ""])

                for cat, count in (dataset.category_distribution or {}).items():
                    writer.writerow(["Source Category", cat, str(count), ""])

                for sent, count in sentiment_counts.items():
                    writer.writerow(["Derived Sentiment", sent, str(count), ""])

                for iss in issues:
                    writer.writerow(["Issue", iss.title, iss.summary, iss.priority])

                for rec in recommendations:
                    writer.writerow(["Recommendation", rec.action, rec.rationale, rec.priority])

        elif export_format == "pdf":
            ReportService._create_pdf(file_path, report_title, summary_payload)

        report = Report(
            id=report_id,
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            title=report_title,
            format=export_format,
            file_path=file_path,
            summary_data=summary_payload,
            status="ready",
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return report

    @staticmethod
    def _create_pdf(file_path: str, title: str, data: Dict[str, Any]):
        doc = SimpleDocTemplate(
            file_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Title"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0f172a"),
            alignment=0,
        )
        h2_style = ParagraphStyle(
            "Heading2",
            parent=styles["Heading2"],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=14,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155"),
        )
        bold_style = ParagraphStyle(
            "Bold",
            parent=body_style,
            fontName="Helvetica-Bold",
        )

        elements = []

        # Header Title
        elements.append(Paragraph(f"<b>InsightFlow</b> | Decision Intelligence Report", body_style))
        elements.append(Paragraph(html.escape(str(title)), title_style))
        elements.append(Paragraph(f"Generated: {html.escape(str(data['generated_at']))} | Scope: {html.escape(str(data['dataset_name']))}", body_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#3b82f6"), spaceAfter=14))

        # Metrics Table
        stats = data["source_statistics"]
        stats_data = [
            [
                Paragraph("<b>Total Source Rows</b>", body_style),
                Paragraph(str(stats.get("total_source_rows", stats.get("total_rows", 0))), bold_style),
                Paragraph("<b>Valid Feedback Records</b>", body_style),
                Paragraph(str(stats.get("valid_feedback_records", stats.get("valid_rows", 0))), bold_style),
            ],
            [
                Paragraph("<b>Excluded / Invalid Rows</b>", body_style),
                Paragraph(str(stats.get("invalid_excluded_rows", stats.get("invalid_rows", 0))), bold_style),
                Paragraph("<b>Distinct Comment Texts</b>", body_style),
                Paragraph(str(stats.get("distinct_exact_comment_texts", stats.get("unique_statements", 0))), bold_style),
            ],
            [
                Paragraph("<b>Extra Duplicate Occurrences</b>", body_style),
                Paragraph(str(stats.get("extra_duplicate_occurrences", stats.get("repeated_rows", 0))), bold_style),
                Paragraph("<b>Timestamp Availability</b>", body_style),
                Paragraph("Unavailable (CSV standard)", body_style),
            ],
        ]
        stats_table = Table(stats_data, colWidths=[140, 130, 140, 130])
        stats_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 14))

        # Top Issues
        elements.append(Paragraph("Key Discovered Issues &amp; Complaint Clusters", h2_style))
        issue_rows = [[
            Paragraph("<b>Priority</b>", bold_style),
            Paragraph("<b>Issue &amp; Evidence</b>", bold_style),
            Paragraph("<b>Category</b>", bold_style),
            Paragraph("<b>Supporting Rows</b>", bold_style),
        ]]

        for iss in data["top_issues"][:6]:
            prio_color = "#dc2626" if iss["priority"] == "Critical" else ("#ea580c" if iss["priority"] == "High" else "#2563eb")
            prio_cell = Paragraph(f"<font color='{prio_color}'><b>{html.escape(str(iss['priority']))}</b></font>", body_style)
            desc_cell = Paragraph(f"<b>{html.escape(str(iss['title']))}</b><br/>{html.escape(str(iss['summary']))}", body_style)
            cat_cell = Paragraph(html.escape(str(iss["category"])), body_style)
            count_cell = Paragraph(f"{iss['supporting_count']} ({iss['unique_supporting_count']} unique)", body_style)
            issue_rows.append([prio_cell, desc_cell, cat_cell, count_cell])

        issue_table = Table(issue_rows, colWidths=[65, 275, 100, 100])
        issue_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(issue_table)
        elements.append(Spacer(1, 14))

        # Recommendations
        elements.append(Paragraph("Intelligent Actionable Recommendations", h2_style))
        rec_rows = [[
            Paragraph("<b>Priority</b>", bold_style),
            Paragraph("<b>Recommended Action &amp; Strategic Rationale</b>", bold_style),
            Paragraph("<b>Expected Qualitative Benefit</b>", bold_style),
        ]]

        for rec in data["actionable_recommendations"][:5]:
            prio_color = "#dc2626" if rec["priority"] == "Critical" else ("#ea580c" if rec["priority"] == "High" else "#2563eb")
            rec_rows.append([
                Paragraph(f"<font color='{prio_color}'><b>{html.escape(str(rec['priority']))}</b></font>", body_style),
                Paragraph(f"<b>{html.escape(str(rec['action']))}</b><br/><font color='#64748b'>{html.escape(str(rec['rationale']))}</font>", body_style),
                Paragraph(html.escape(str(rec["expected_benefit"] or "Operational optimization")), body_style),
            ])

        rec_table = Table(rec_rows, colWidths=[65, 305, 170])
        rec_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(rec_table)
        elements.append(Spacer(1, 14))

        # Limitations & Governance
        elements.append(Paragraph("System Governance &amp; Analysis Limitations", h2_style))
        for lim in data["methodology_and_limitations"]:
            elements.append(Paragraph(f"• {html.escape(str(lim))}", body_style))

        doc.build(elements)
