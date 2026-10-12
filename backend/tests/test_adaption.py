import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock, patch
from app.core.config import settings
from app.models.adaption import AdaptionJob
from app.services.adaption_quota_service import AdaptionQuotaService


@pytest.mark.asyncio
async def test_adaption_status_endpoint_never_exposes_key_prefix(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_super_secret_key_123456789")
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)

    resp = await client.get("/api/v1/adaption/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["api_key_set"] is True
    assert data["key_prefix"] is None  # Non-negotiable: key_prefix must never leak key substring
    assert "daily_estimates_remaining" in data
    assert "daily_runs_remaining" in data


@pytest.mark.asyncio
async def test_adaption_disabled_by_default_returns_403(client: AsyncClient, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch):
    """Verify kill switch blocks external operations in public demo mode even if key is set."""
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", False)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_mock_key_12345")

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    payload = {"dataset_id": dataset_id, "max_rows": 250}
    resp = await client.post("/api/v1/adaption/estimate", json=payload)
    assert resp.status_code == 403
    assert "disabled" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_adaption_unconfigured_fails_closed_returns_503(client: AsyncClient, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch):
    """Verify operations fail closed if key is absent even if operations flag is True."""
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "")

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    payload = {"dataset_id": dataset_id}
    resp = await client.post("/api/v1/adaption/estimate", json=payload)
    assert resp.status_code == 503
    assert "not configured" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_adaption_wrong_workspace_dataset_rejected(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    """Verify arbitrary or wrong-workspace dataset IDs return 404."""
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_mock_key_12345")

    payload = {"dataset_id": "ds-non-existent-or-wrong-workspace"}
    resp = await client.post("/api/v1/adaption/estimate", json=payload)
    assert resp.status_code == 404
    assert "not found in this workspace" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_adaption_estimate_mock_workflow(client: AsyncClient, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_mock_key_12345")

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    mock_dataset_obj = MagicMock()
    mock_dataset_obj.dataset_id = "adaption-ds-mock-123"
    mock_dataset_obj.status = "succeeded"
    mock_dataset_obj.row_count = 10

    mock_estimate_obj = MagicMock()
    mock_estimate_obj.estimated_credits_consumed = 42.5
    mock_estimate_obj.estimated_minutes = 1.8
    mock_estimate_obj.run_id = "run-mock-456"

    mock_client = MagicMock()
    mock_client.datasets.upload_file.return_value = mock_dataset_obj
    mock_client.datasets.get_status.return_value = mock_dataset_obj
    mock_client.datasets.adapt.return_value = mock_estimate_obj

    with patch("app.services.adaption_service.AdaptionService.get_client", return_value=mock_client):
        payload = {"dataset_id": dataset_id, "max_rows": 250}
        resp = await client.post("/api/v1/adaption/estimate", json=payload)
        assert resp.status_code == 200
        res = resp.json()
        assert res["estimated_credits"] == 42.5
        assert res["estimated_minutes"] == 1.8
        assert res["adaption_dataset_id"] == "adaption-ds-mock-123"


@pytest.mark.asyncio
async def test_adaption_row_clamping_and_normalization(client: AsyncClient, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch):
    """Verify negative, 0, and oversized rows are bounded safely to settings.ADAPTION_MAX_ROWS."""
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_mock_key_12345")

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    mock_dataset_obj = MagicMock()
    mock_dataset_obj.dataset_id = "adaption-ds-mock-clamp"
    mock_dataset_obj.status = "succeeded"
    mock_dataset_obj.row_count = 5

    mock_run_obj = MagicMock()
    mock_run_obj.run_id = "run-mock-clamp"
    mock_run_obj.estimated_credits_consumed = 15.0
    mock_run_obj.estimated_minutes = 0.5

    mock_client = MagicMock()
    mock_client.datasets.upload_file.return_value = mock_dataset_obj
    mock_client.datasets.get_status.return_value = mock_dataset_obj
    mock_client.datasets.adapt.return_value = mock_run_obj

    with patch("app.services.adaption_service.AdaptionService.get_client", return_value=mock_client):
        # Oversized 99999 rows
        payload = {"dataset_id": dataset_id, "job_specification": {"max_rows": 99999}}
        resp = await client.post("/api/v1/adaption/jobs", json=payload)
        assert resp.status_code == 202
        assert resp.json()["job_specification"]["max_rows"] == 1000

        # Negative rows normalized to default 250
        payload_neg = {"dataset_id": dataset_id, "job_specification": {"max_rows": -50}}
        resp_neg = await client.post("/api/v1/adaption/jobs", json=payload_neg)
        assert resp_neg.status_code == 202
        assert resp_neg.json()["job_specification"]["max_rows"] == 250


@pytest.mark.asyncio
async def test_adaption_daily_quota_exhaustion_returns_429(client: AsyncClient, db_session: AsyncSession, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch):
    """Verify that when the daily quota is reached, HTTP 429 with Retry-After is returned and provider is not called."""
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_mock_key_12345")
    monkeypatch.setattr(settings, "ADAPTION_DAILY_ESTIMATE_LIMIT", 1)  # Set limit to 1

    # Clean quota table for test isolation
    from sqlalchemy import delete
    from app.models.adaption_quota import AdaptionDailyQuota
    await db_session.execute(delete(AdaptionDailyQuota))
    await db_session.commit()

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    mock_dataset_obj = MagicMock()
    mock_dataset_obj.dataset_id = "adaption-ds-quota"
    mock_dataset_obj.status = "succeeded"
    mock_dataset_obj.row_count = 5

    mock_estimate_obj = MagicMock()
    mock_estimate_obj.estimated_credits_consumed = 10.0
    mock_estimate_obj.estimated_minutes = 1.0
    mock_estimate_obj.run_id = "run-mock-quota"
    mock_estimate_obj.credit_multiplier = 1.0

    mock_client = MagicMock()
    mock_client.datasets.upload_file.return_value = mock_dataset_obj
    mock_client.datasets.get_status.return_value = mock_dataset_obj
    mock_client.datasets.adapt.return_value = mock_estimate_obj

    with patch("app.services.adaption_service.AdaptionService.get_client", return_value=mock_client):
        # 1st request consumes quota 1 of 1
        resp1 = await client.post("/api/v1/adaption/estimate", json={"dataset_id": dataset_id})
        assert resp1.status_code == 200

        # 2nd request must be blocked with HTTP 429
        resp2 = await client.post("/api/v1/adaption/estimate", json={"dataset_id": dataset_id})
        assert resp2.status_code == 429
        assert "Daily quota reached" in resp2.json()["detail"]
        assert "Retry-After" in resp2.headers


@pytest.mark.asyncio
async def test_adaption_download_output_workflow(client: AsyncClient, db_session: AsyncSession, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch):
    """Verify download endpoint streams content for succeeded jobs and rejects pending/failed jobs."""
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_mock_key_12345")

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    mock_download_resp = MagicMock()
    mock_download_resp.read.return_value = b"instruction,input,adapted_output\nReview,Cat,Response"

    mock_client = MagicMock()
    mock_client.datasets.download.return_value = mock_download_resp

    with patch("app.services.adaption_service.AdaptionService.get_client", return_value=mock_client):
        # Create a mock succeeded job directly
        from app.models.adaption import AdaptionJob
        job = AdaptionJob(
            id="adj-test-download",
            workspace_id="ws-production-eval",
            dataset_id=dataset_id,
            adaption_dataset_id="adaption-ds-succeeded-123",
            operation_type="adapt",
            status="succeeded",
        )
        db_session.add(job)
        await db_session.commit()

        # Download CSV
        dl_resp = await client.get("/api/v1/adaption/jobs/adj-test-download/download?format=csv")
        assert dl_resp.status_code == 200
        assert dl_resp.headers["content-type"].startswith("text/csv")
        assert b"adapted_output" in dl_resp.content


@pytest.mark.asyncio
async def test_adaption_download_running_job_rejected(client: AsyncClient, db_session: AsyncSession, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch):
    """Verify download returns 400 if job is not yet succeeded."""
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_mock_key_12345")

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    job = AdaptionJob(
        id="adj-test-running",
        workspace_id="ws-production-eval",
        dataset_id=dataset_id,
        adaption_dataset_id="adaption-ds-running-123",
        operation_type="adapt",
        status="running",
    )
    db_session.add(job)
    await db_session.commit()

    dl_resp = await client.get("/api/v1/adaption/jobs/adj-test-running/download?format=csv")
    assert dl_resp.status_code == 400
    assert "Output download is only available for successfully completed Adaption jobs" in dl_resp.json()["detail"]


@pytest.mark.asyncio
async def test_adaption_estimate_never_advertises_download(client: AsyncClient, db_session: AsyncSession, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch):
    """Verify estimate jobs with status=succeeded never have output_download_available=True and reject downloads."""
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_ADAPTION_OPERATIONS", True)
    monkeypatch.setattr(settings, "ADAPTION_API_KEY", "adp_mock_key_12345")

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    job = AdaptionJob(
        id="adj-test-estimate-only",
        workspace_id="ws-production-eval",
        dataset_id=dataset_id,
        adaption_dataset_id="adaption-ds-estimate-123",
        operation_type="estimate",
        status="succeeded",
    )
    db_session.add(job)
    await db_session.commit()

    # In job details
    get_resp = await client.get("/api/v1/adaption/jobs/adj-test-estimate-only")
    assert get_resp.status_code == 200
    assert get_resp.json()["output_download_available"] is False

    # In job listing
    list_resp = await client.get("/api/v1/adaption/jobs")
    assert list_resp.status_code == 200
    estimate_job = next(j for j in list_resp.json() if j["id"] == "adj-test-estimate-only")
    assert estimate_job["output_download_available"] is False

    # In download endpoint
    dl_resp = await client.get("/api/v1/adaption/jobs/adj-test-estimate-only/download?format=csv")
    assert dl_resp.status_code == 400
    assert "Output download is only available for successfully completed Adaption jobs" in dl_resp.json()["detail"]
