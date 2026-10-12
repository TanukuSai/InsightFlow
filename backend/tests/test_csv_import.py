import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_csv_import_success(client: AsyncClient, sample_csv_content: bytes):
    files = {"file": ("test_feedback.csv", sample_csv_content, "text/csv")}
    data = {"name": "Test Ingestion Dataset"}
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-test"}

    response = await client.post("/api/v1/datasets/import", files=files, data=data, headers=headers)
    assert response.status_code == 201
    res = response.json()

    assert res["name"] == "Test Ingestion Dataset"
    assert res["total_rows"] == 5
    assert res["valid_rows"] == 5
    assert res["unique_exact_statements"] == 4
    assert res["repeated_rows"] == 1
    assert res["categories"]["Operational Issues"] == 2
    assert res["categories"]["Fraud and Scam"] == 1
    assert res["has_timestamps"] is False

    # Check imported feedback directly to ensure sentiment is NULL
    dataset_id = res["dataset_id"]
    fb_resp = await client.get(f"/api/v1/feedback?dataset_id={dataset_id}", headers=headers)
    assert fb_resp.status_code == 200
    feedbacks = fb_resp.json()["items"]
    assert len(feedbacks) == 5

    # CRITICAL ACCEPTANCE CRITERIA: Sentiment must be NULL before analysis runs!
    for fb in feedbacks:
        assert fb["sentiment_label"] is None
        assert fb["sentiment_score"] is None
        assert fb["analysis_status"] == "pending"
        # But source_category is preserved
        assert fb["source_category"] in ["Operational Issues", "Fraud and Scam", "Product Feedback", "Customer Service"]


@pytest.mark.asyncio
async def test_csv_import_empty_file(client: AsyncClient):
    files = {"file": ("empty.csv", b"", "text/csv")}
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-test"}
    response = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_csv_import_invalid_extension(client: AsyncClient):
    files = {"file": ("data.txt", b"some text", "text/plain")}
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-test"}
    response = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    assert response.status_code == 400
    assert "must be a .csv file" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_canonical_seed_idempotent(db_session):
    from app.db.seed import seed_canonical_dataset_if_needed
    from app.models.dataset import Dataset
    from app.core.config import settings
    from sqlalchemy import select

    # Call seeder
    await seed_canonical_dataset_if_needed(db_session)
    res = await db_session.execute(select(Dataset).where(Dataset.id == settings.CANONICAL_DATASET_ID))
    d = res.scalar_one_or_none()
    assert d is not None
    assert d.id == settings.CANONICAL_DATASET_ID

    # Second call is idempotent no-op
    await seed_canonical_dataset_if_needed(db_session)
    res2 = await db_session.execute(select(Dataset).where(Dataset.id == settings.CANONICAL_DATASET_ID))
    assert res2.scalar_one_or_none() is not None
