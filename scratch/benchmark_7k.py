import asyncio
import os
import sys
import time
import httpx

# Add backend directory
sys.path.insert(0, os.path.abspath("backend"))

from app.main import app
from app.db.migrations import init_db
from httpx import ASGITransport


async def run_real_dataset_benchmark():
    await init_db()
    csv_path = "data/BuildBattle_2026_Customer_Feedback_Dataset.csv"
    print("Ingesting full 7,000-row customer feedback dataset:", csv_path)

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-production-eval"}

        # 1. Upload CSV
        t0 = time.time()
        with open(csv_path, "rb") as f:
            files = {"file": ("BuildBattle_2026_Customer_Feedback_Dataset.csv", f, "text/csv")}
            data = {"name": "Build Battle 2026 Hackathon Dataset"}
            resp = await client.post("/api/v1/datasets/import", files=files, data=data, headers=headers)

        t_upload = time.time() - t0
        print(f"Upload and batch insert completed in {t_upload:.2f}s with status {resp.status_code}")
        summary = resp.json()
        print("Import Summary:")
        print("  Total Rows:", summary["total_rows"])
        print("  Unique Statements:", summary["unique_exact_statements"])
        print("  Repeated Rows:", summary["repeated_rows"])
        print("  Categories:", summary["categories"])

        dataset_id = summary["dataset_id"]

        # 2. Check Dashboard before analysis
        dash1 = (await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)).json()
        print("\nDashboard before analysis:")
        print("  Analysis Status:", dash1["analysis_status"])
        print("  Sentiment Distribution:", dash1["sentiment_distribution"])
        print("  Temporal Available:", dash1["temporal_available"])

        # 3. Trigger Analysis
        t1 = time.time()
        ana_resp = await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json={}, headers=headers)
        print("\nAnalysis triggered:", ana_resp.json()["status"])

        # 4. Check Dashboard after analysis
        dash2 = (await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)).json()
        print(f"Analysis, issue linking & recommendations completed in {time.time() - t1:.2f}s")
        print("\nDashboard after analysis:")
        print("  Analysis Status:", dash2["analysis_status"])
        print("  Sentiment Distribution:", dash2["sentiment_distribution"])
        print("  Average Sentiment Score:", dash2["average_sentiment_score"])
        print("  Top Recurring Issues Count:", len(dash2["top_recurring_issues"]))
        for iss in dash2["top_recurring_issues"][:5]:
            prio = iss["priority"]
            title = iss["title"]
            sc = iss["supporting_count"]
            usc = iss["unique_supporting_count"]
            print(f"    [{prio}] {title}: {sc} supporting ({usc} unique)")

        # 5. Generate and export PDF Report
        t2 = time.time()
        rep_resp = await client.post("/api/v1/reports", json={"dataset_id": dataset_id, "format": "pdf"}, headers=headers)
        rep_data = rep_resp.json()
        pdf_dl = await client.get(rep_data["download_url"], headers=headers)
        print(f"\nPDF Report generated and downloaded in {time.time() - t2:.2f}s (size: {len(pdf_dl.content):,} bytes)")
        print("Report path:", rep_data["file_path"])


if __name__ == "__main__":
    asyncio.run(run_real_dataset_benchmark())
