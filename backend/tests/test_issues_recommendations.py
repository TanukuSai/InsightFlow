import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_issues_and_evidence(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-issue-test"}

    # 1. Import and analyze
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]
    await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json={}, headers=headers)

    # 2. List issues
    iss_resp = await client.get(f"/api/v1/issues?dataset_id={dataset_id}", headers=headers)
    assert iss_resp.status_code == 200
    issues = iss_resp.json()
    assert len(issues) > 0

    first_issue = issues[0]
    assert first_issue["priority"] in ["Critical", "High", "Medium", "Low"]
    assert len(first_issue["priority_explanation"]) > 10
    assert first_issue["supporting_count"] > 0
    assert first_issue["is_tracked"] is False

    # 3. Retrieve issue with evidence links
    detail_resp = await client.get(f"/api/v1/issues/{first_issue['id']}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert "supporting_evidence" in detail
    assert len(detail["supporting_evidence"]) > 0
    first_evidence = detail["supporting_evidence"][0]
    assert "original_text" in first_evidence
    assert "feedback_id" in first_evidence

    # 4. Track and untrack
    track_resp = await client.post(f"/api/v1/issues/{first_issue['id']}/track", headers=headers)
    assert track_resp.status_code == 200
    assert track_resp.json()["is_tracked"] is True

    untrack_resp = await client.delete(f"/api/v1/issues/{first_issue['id']}/track", headers=headers)
    assert untrack_resp.status_code == 200
    assert untrack_resp.json()["is_tracked"] is False


@pytest.mark.asyncio
async def test_recommendations_flow(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-rec-test"}

    # 1. Import and analyze
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]
    await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json={}, headers=headers)

    # 2. List recommendations
    rec_resp = await client.get(f"/api/v1/recommendations?dataset_id={dataset_id}", headers=headers)
    assert rec_resp.status_code == 200
    recs = rec_resp.json()
    assert len(recs) > 0

    first_rec = recs[0]
    assert len(first_rec["action"]) > 10
    assert len(first_rec["rationale"]) > 10

    # 3. Track recommendation
    track_resp = await client.post(f"/api/v1/recommendations/{first_rec['id']}/track", headers=headers)
    assert track_resp.status_code == 200
    assert track_resp.json()["is_tracked"] is True
