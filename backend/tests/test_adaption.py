import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock, patch


@pytest.mark.asyncio
async def test_adaption_status_endpoint(client: AsyncClient):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-adapt-test"}
    resp = await client.get("/api/v1/adaption/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "configured" in data
    assert "sdk_version" in data
    assert "api_key_set" in data


@pytest.mark.asyncio
async def test_adaption_estimate_with_mock(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-adapt-test"}

    # Import dataset
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]

    # Mock Adaption client methods
    mock_dataset_obj = MagicMock()
    mock_dataset_obj.dataset_id = "adaption-ds-mock-123"

    mock_estimate_obj = MagicMock()
    mock_estimate_obj.estimated_credits_consumed = 50.0
    mock_estimate_obj.estimated_minutes = 2.5
    mock_estimate_obj.run_id = "run-mock-456"

    mock_client = MagicMock()
    mock_client.datasets.upload_file.return_value = mock_dataset_obj
    mock_client.datasets.adapt.return_value = mock_estimate_obj

    with patch("app.services.adaption_service.AdaptionService.get_client", return_value=mock_client):
        payload = {"dataset_id": dataset_id, "max_rows": 500}
        resp = await client.post("/api/v1/adaption/estimate", json=payload, headers=headers)
        assert resp.status_code == 200
        res = resp.json()
        assert res["estimated_credits"] == 50.0
        assert res["estimated_minutes"] == 2.5
        assert res["adaption_dataset_id"] == "adaption-ds-mock-123"


@pytest.mark.asyncio
async def test_adaption_unconfigured_error_handling(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-adapt-test"}

    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]

    # When get_client returns None (unconfigured)
    with patch("app.services.adaption_service.AdaptionService.get_client", return_value=None):
        payload = {"dataset_id": dataset_id}
        resp = await client.post("/api/v1/adaption/estimate", json=payload, headers=headers)
        # CRITICAL ACCEPTANCE CRITERIA: Must NOT fabricate a successful job!
        assert resp.status_code in [502, 503]
        assert "not configured" in resp.json()["detail"].lower()
