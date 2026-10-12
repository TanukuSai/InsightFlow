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


@pytest.mark.asyncio
async def test_production_fails_closed_without_auth(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "APP_ENV", "production")
    # Missing authorization header in production MUST fail closed with 401
    resp = await client.get("/api/v1/datasets")
    assert resp.status_code == 401
    assert "Missing Authorization header" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_production_rejects_dev_tokens(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "APP_ENV", "production")
    # Dev tokens are prohibited in production
    resp = await client.get("/api/v1/datasets", headers={"Authorization": "Bearer dev-token-x"})
    assert resp.status_code == 401
    assert "Development tokens are not permitted" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_production_jwt_signature_verification(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    import jwt
    import time
    from app.core.config import settings

    secret = "test-production-jwt-secret-key-12345"
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", secret)

    # 1. Valid signed token succeeds
    valid_payload = {
        "sub": "usr-test-prod",
        "email": "prod@insightflow.ai",
        "user_metadata": {"workspace_id": "ws-prod-verified"},
        "exp": int(time.time()) + 3600,
    }
    valid_token = jwt.encode(valid_payload, secret, algorithm="HS256")
    res_valid = await client.get("/api/v1/datasets", headers={"Authorization": f"Bearer {valid_token}"})
    assert res_valid.status_code == 200

    # 2. Token signed with wrong secret is rejected with 401
    bad_token = jwt.encode(valid_payload, "wrong-secret-key", algorithm="HS256")
    res_bad = await client.get("/api/v1/datasets", headers={"Authorization": f"Bearer {bad_token}"})
    assert res_bad.status_code == 401

    # 3. Expired token is rejected with 401
    expired_payload = {
        "sub": "usr-test-prod",
        "exp": int(time.time()) - 3600,
    }
    expired_token = jwt.encode(expired_payload, secret, algorithm="HS256")
    res_expired = await client.get("/api/v1/datasets", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401
    assert "expired" in res_expired.json()["detail"].lower()

    # 4. Cross-tenant header spoofing in production is rejected with 403
    res_spoof = await client.get(
        "/api/v1/datasets",
        headers={"Authorization": f"Bearer {valid_token}", "X-Workspace-Id": "ws-other-tenant"},
    )
    assert res_spoof.status_code == 403
