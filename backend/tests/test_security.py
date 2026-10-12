import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.core.security import verify_token, PublicDemoContext


def test_public_demo_context_contract():
    """Verify that PublicDemoContext always binds to the authoritative demo workspace."""
    ctx = verify_token()
    assert isinstance(ctx, PublicDemoContext)
    assert ctx.workspace_id == settings.PUBLIC_DEMO_WORKSPACE_ID
    assert ctx.is_demo is True

    # Untrusted headers must be ignored and bound strictly to PUBLIC_DEMO_WORKSPACE_ID
    spoofed_ctx = verify_token(
        authorization="Bearer malicious-or-spoofed-token",
        x_workspace_id="workspace-attacker-tenant",
    )
    assert spoofed_ctx.workspace_id == settings.PUBLIC_DEMO_WORKSPACE_ID


@pytest.mark.asyncio
async def test_endpoints_accessible_without_auth_headers(client: AsyncClient):
    """Verify that all public demo endpoints succeed with zero tokens or credentials."""
    resp = await client.get("/api/v1/datasets")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_untrusted_workspace_headers_are_safely_bound(
    client: AsyncClient, sample_csv_content: bytes
):
    """
    Verify that callers passing arbitrary or spoofed X-Workspace-Id headers
    do not cause 401/403 errors and are safely bound to the single demo workspace.
    """
    headers_spoofed = {"X-Workspace-Id": "arbitrary-spoofed-workspace"}

    files = {"file": ("demo_feedback.csv", sample_csv_content, "text/csv")}
    resp = await client.post("/api/v1/datasets/import", files=files, headers=headers_spoofed)
    assert resp.status_code == 201
    data = resp.json()
    dataset_id = data["dataset_id"]

    get_resp = await client.get(f"/api/v1/datasets/{dataset_id}")
    assert get_resp.status_code == 200
    dataset = get_resp.json()
    assert dataset["id"] == dataset_id
    assert dataset["workspace_id"] == settings.PUBLIC_DEMO_WORKSPACE_ID


@pytest.mark.asyncio
async def test_canonical_dataset_protected_from_deletion(client: AsyncClient):
    """The canonical seed dataset can never be deleted by public clients."""
    resp = await client.delete(f"/api/v1/datasets/{settings.CANONICAL_DATASET_ID}")
    assert resp.status_code == 403
    assert "canonical" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_anonymous_dataset_deletion_disabled(
    client: AsyncClient, sample_csv_content: bytes
):
    """Anonymous visitors cannot delete datasets in the shared demo workspace."""
    files = {"file": ("custom.csv", sample_csv_content, "text/csv")}
    resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = resp.json()["dataset_id"]

    del_resp = await client.delete(f"/api/v1/datasets/{dataset_id}")
    assert del_resp.status_code == 403
    assert "disabled in the public demonstration workspace" in del_resp.json()["detail"]


@pytest.mark.asyncio
async def test_rate_limiting_enforcement(
    client: AsyncClient, sample_csv_content: bytes, monkeypatch: pytest.MonkeyPatch
):
    """Verify that repeated requests exceeding configured limit return 429 with Retry-After."""
    monkeypatch.setattr(settings, "RATE_LIMIT_IMPORTS_PER_HOUR", 2)

    files1 = {"file": ("f1.csv", sample_csv_content, "text/csv")}
    r1 = await client.post("/api/v1/datasets/import", files=files1)
    assert r1.status_code == 201

    files2 = {"file": ("f2.csv", sample_csv_content, "text/csv")}
    r2 = await client.post("/api/v1/datasets/import", files=files2)
    assert r2.status_code == 201

    # Third import exceeds limit
    files3 = {"file": ("f3.csv", sample_csv_content, "text/csv")}
    r3 = await client.post("/api/v1/datasets/import", files=files3)
    assert r3.status_code == 429
    assert "rate limit exceeded" in r3.json()["detail"].lower()
    assert "retry-after" in r3.headers


@pytest.mark.asyncio
async def test_max_csv_row_bound_enforced(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """Verify that uploads exceeding MAX_CSV_ROWS are rejected before committing."""
    monkeypatch.setattr(settings, "MAX_CSV_ROWS", 10)

    # 15 rows exceeds limit of 10
    rows = ["review,category"] + [f"Review statement {i},Product Feedback" for i in range(15)]
    content = "\n".join(rows).encode("utf-8")

    files = {"file": ("oversized_rows.csv", content, "text/csv")}
    resp = await client.post("/api/v1/datasets/import", files=files)
    assert resp.status_code == 422
    assert "exceeding the public demo limit" in resp.json()["detail"]
