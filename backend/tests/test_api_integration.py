import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_complete_end_to_end_journey(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token-journey", "X-Workspace-Id": "ws-e2e"}

    # 1. Health check
    health = await client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    ready = await client.get("/ready")
    assert ready.status_code == 200
    assert ready.json()["ready"] is True

    # 2. Upload CSV
    files = {"file": ("customer_reviews.csv", sample_csv_content, "text/csv")}
    imp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    assert imp.status_code == 201
    dataset_id = imp.json()["dataset_id"]

    # 3. Verify Feedback search and filters
    fb_search = await client.get(f"/api/v1/feedback?dataset_id={dataset_id}&search=scam", headers=headers)
    assert fb_search.status_code == 200
    assert fb_search.json()["total"] == 1
    assert "scam" in fb_search.json()["items"][0]["original_text"].lower()

    # 4. Trigger Analysis
    ana = await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json={}, headers=headers)
    assert ana.status_code == 202

    # 5. Verify Dashboard
    dash = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)
    assert dash.status_code == 200
    dash_data = dash.json()
    assert dash_data["dataset_id"] == dataset_id
    assert dash_data["total_source_rows"] == 5
    assert len(dash_data["top_recurring_issues"]) > 0

    # 6. Inspect Issue & Evidence
    issue_id = dash_data["top_recurring_issues"][0]["id"]
    iss = await client.get(f"/api/v1/issues/{issue_id}", headers=headers)
    assert iss.status_code == 200
    assert len(iss.json()["supporting_evidence"]) > 0

    # 7. Generate & Download PDF Report
    rep = await client.post(
        "/api/v1/reports",
        json={"dataset_id": dataset_id, "format": "pdf", "title": "End-to-End Executive Summary"},
        headers=headers,
    )
    assert rep.status_code == 201
    dl_url = rep.json()["download_url"]
    dl = await client.get(dl_url, headers=headers)
    assert dl.status_code == 200
    assert dl.headers["content-type"] == "application/pdf"
