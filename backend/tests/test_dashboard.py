import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_unanalysed_dataset(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-dash-test"}

    # Import
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]

    # Dashboard check before analysis
    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["dataset_id"] == dataset_id
    assert data["total_source_rows"] == 5
    assert data["unique_exact_statements"] == 4
    assert data["repeated_rows"] == 1
    assert data["has_timestamps"] is False
    assert data["temporal_available"] is False
    assert "cannot be fabricated" in data["temporal_message"] or "unavailable" in data["temporal_message"]

    # Crucial assertion: Sentiment must NOT exist before analysis!
    assert data["sentiment_distribution"] is None
    assert data["average_sentiment_score"] is None
    assert data["analysis_status"] == "unanalysed"

    # Category counts must come from source category
    assert data["source_category_distribution"]["Operational Issues"] == 2
    assert data["source_category_distribution"]["Fraud and Scam"] == 1


@pytest.mark.asyncio
async def test_dashboard_after_analysis(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-dash-analyzed"}

    # Import
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]

    # Analyze
    await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json={}, headers=headers)

    # Dashboard check
    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["sentiment_distribution"] is not None
    assert data["sentiment_distribution"]["total_analyzed"] > 0
    assert data["average_sentiment_score"] is not None
    assert len(data["top_recurring_issues"]) > 0
    assert len(data["top_recommendations"]) > 0
