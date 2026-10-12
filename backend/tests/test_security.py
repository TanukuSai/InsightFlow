import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_workspace_isolation(client: AsyncClient, sample_csv_content: bytes):
    headers_org_a = {"Authorization": "Bearer dev-token-a", "X-Workspace-Id": "workspace-alpha"}
    headers_org_b = {"Authorization": "Bearer dev-token-b", "X-Workspace-Id": "workspace-beta"}

    # Workspace A imports a dataset
    files = {"file": ("alpha_feedback.csv", sample_csv_content, "text/csv")}
    resp = await client.post("/api/v1/datasets/import", files=files, headers=headers_org_a)
    assert resp.status_code == 201
    dataset_id = resp.json()["dataset_id"]

    # Workspace A can read its dataset
    get_a = await client.get(f"/api/v1/datasets/{dataset_id}", headers=headers_org_a)
    assert get_a.status_code == 200

    # Workspace B CANNOT access Workspace A's dataset! (Must return 404 Not Found)
    get_b = await client.get(f"/api/v1/datasets/{dataset_id}", headers=headers_org_b)
    assert get_b.status_code == 404

    # Workspace B listing datasets will not see Workspace A's dataset
    list_b = await client.get("/api/v1/datasets", headers=headers_org_b)
    assert list_b.status_code == 200
    b_ids = [d["id"] for d in list_b.json()]
    assert dataset_id not in b_ids
