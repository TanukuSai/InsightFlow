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

    # CSV import with spoofed header still succeeds and attaches to demo workspace
    files = {"file": ("demo_feedback.csv", sample_csv_content, "text/csv")}
    resp = await client.post("/api/v1/datasets/import", files=files, headers=headers_spoofed)
    assert resp.status_code == 201
    data = resp.json()
    dataset_id = data["dataset_id"]

    # Accessing the dataset without any headers succeeds
    get_resp = await client.get(f"/api/v1/datasets/{dataset_id}")
    assert get_resp.status_code == 200
    dataset = get_resp.json()
    assert dataset["id"] == dataset_id
    assert dataset["workspace_id"] == settings.PUBLIC_DEMO_WORKSPACE_ID
