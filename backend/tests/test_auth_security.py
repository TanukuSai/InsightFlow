import pytest
import jwt
from datetime import timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.core.security import hash_password, create_access_token, verify_password
from app.models.user import User
from app.models.workspace import Workspace
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.scripts.create_test_account import create_or_verify_account


@pytest.mark.asyncio
async def test_registration_and_login_flow(unauth_client: AsyncClient):
    """Verify registration, email normalization, and login."""
    reg_payload = {
        "email": "  NewUser@Example.COM  ",
        "password": "ValidPassword123!",
        "full_name": "New User",
    }
    resp = await unauth_client.post("/api/v1/auth/register", json=reg_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["full_name"] == "New User"
    assert data["user"]["workspace_id"].startswith("ws-")

    # Duplicate registration must fail
    dup_resp = await unauth_client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"].lower()

    # Login with normalized email
    login_resp = await unauth_client.post(
        "/api/v1/auth/login",
        json={"email": "newuser@example.com", "password": "ValidPassword123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Verify /me
    me_resp = await unauth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "newuser@example.com"


@pytest.mark.asyncio
async def test_weak_password_rejected(unauth_client: AsyncClient):
    """Passwords shorter than 12 characters must be rejected."""
    resp = await unauth_client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": "short", "full_name": "Weak Pwd"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_invalid_login_credentials(unauth_client: AsyncClient):
    """Wrong password or non-existent email returns generic 401."""
    resp = await unauth_client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "SomePassword123!"},
    )
    assert resp.status_code == 401
    assert "invalid email or password" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_protected_endpoints_fail_closed_without_auth(unauth_client: AsyncClient):
    """All data endpoints must return 401 for unauthenticated calls."""
    routes = [
        "/api/v1/datasets",
        "/api/v1/feedback",
        "/api/v1/issues",
        "/api/v1/recommendations",
        "/api/v1/reports",
        "/api/v1/adaption/status",
        "/api/v1/auth/me",
    ]
    for r in routes:
        resp = await unauth_client.get(r)
        assert resp.status_code == 401, f"Route {r} did not fail closed on missing token (status {resp.status_code})"


@pytest.mark.asyncio
async def test_invalid_and_expired_tokens_rejected(unauth_client: AsyncClient):
    """Malformed, bad signature, and expired tokens must return 401."""
    # Malformed
    r1 = await unauth_client.get("/api/v1/datasets", headers={"Authorization": "Bearer not-a-valid-token"})
    assert r1.status_code == 401

    # Bad signature
    tampered_token = jwt.encode(
        {"sub": "usr-test-runner-01", "iss": "insightflow"},
        "wrong-secret-key-at-least-32-bytes-length-here!",
        algorithm="HS256",
    )
    r2 = await unauth_client.get("/api/v1/datasets", headers={"Authorization": f"Bearer {tampered_token}"})
    assert r2.status_code == 401

    # Expired token
    expired_token = create_access_token(
        subject="usr-test-runner-01",
        expires_delta=timedelta(seconds=-10),
    )
    r3 = await unauth_client.get("/api/v1/datasets", headers={"Authorization": f"Bearer {expired_token}"})
    assert r3.status_code == 401
    assert "expired" in r3.json()["detail"].lower()


@pytest.mark.asyncio
async def test_workspace_isolation_between_users(unauth_client: AsyncClient, db_session):
    """User A must not be able to list, read, or modify User B's records."""
    # Register User A
    res_a = await unauth_client.post(
        "/api/v1/auth/register",
        json={"email": "usera@example.com", "password": "UserAPassword123!", "full_name": "User A"},
    )
    token_a = res_a.json()["access_token"]
    ws_a = res_a.json()["user"]["workspace_id"]

    # Register User B
    res_b = await unauth_client.post(
        "/api/v1/auth/register",
        json={"email": "userb@example.com", "password": "UserBPassword123!", "full_name": "User B"},
    )
    token_b = res_b.json()["access_token"]
    ws_b = res_b.json()["user"]["workspace_id"]
    assert ws_a != ws_b

    # User A creates feedback in User A's workspace
    # First create dataset in User A's workspace
    ds_a = Dataset(
        id="ds-tenant-a",
        workspace_id=ws_a,
        name="Dataset A",
        original_filename="a.csv",
        row_count=1,
        valid_rows=1,
    )
    fb_a = Feedback(
        id="fb-tenant-a",
        workspace_id=ws_a,
        dataset_id=ds_a.id,
        original_text="Private comment A",
    )
    db_session.add_all([ds_a, fb_a])
    await db_session.commit()

    # User B lists datasets: must NOT see Dataset A
    b_datasets_resp = await unauth_client.get(
        "/api/v1/datasets",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert b_datasets_resp.status_code == 200
    b_dataset_ids = [d["id"] for d in b_datasets_resp.json()]
    assert "ds-tenant-a" not in b_dataset_ids

    # User B attempts to access Dataset A directly by ID: must return 404
    b_get_ds_resp = await unauth_client.get(
        "/api/v1/datasets/ds-tenant-a",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert b_get_ds_resp.status_code == 404

    # User B attempts to access Feedback A directly by ID: must return 404
    b_get_fb_resp = await unauth_client.get(
        "/api/v1/feedback/fb-tenant-a",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert b_get_fb_resp.status_code == 404

    # User B tries to spoof X-Workspace-Id to User A's workspace: must NOT switch workspace
    spoofed_resp = await unauth_client.get(
        "/api/v1/datasets",
        headers={
            "Authorization": f"Bearer {token_b}",
            "X-Workspace-Id": ws_a,
        },
    )
    assert spoofed_resp.status_code == 200
    assert "ds-tenant-a" not in [d["id"] for d in spoofed_resp.json()]


@pytest.mark.asyncio
async def test_operator_create_test_account_script_idempotent():
    """Verify create_test_account script creates account and is safe on repeat runs."""
    ws_id, pwd = await create_or_verify_account(
        email="operator_test@insightflow.ai",
        password="TestPassword123!@",
        full_name="Operator Test",
        claim_legacy_workspace=False,
        seed_data=False,
    )
    assert ws_id is not None
    assert pwd == "TestPassword123!@"

    # Running a second time should detect existing account and not overwrite password
    ws_id_2, pwd_2 = await create_or_verify_account(
        email="operator_test@insightflow.ai",
        full_name="Operator Test",
    )
    assert ws_id_2 == ws_id
    assert pwd_2 is None  # Password not modified


@pytest.mark.asyncio
async def test_bff_shared_secret_enforcement(unauth_client: AsyncClient):
    """Direct auth requests with missing or invalid BFF secret must be rejected when secret is supplied/tested."""
    # Invalid secret must return 403
    bad_resp = await unauth_client.post(
        "/api/v1/auth/login",
        json={"email": "operator_test@insightflow.ai", "password": "TestPassword123!@"},
        headers={"X-BFF-Secret": "invalid-hacker-secret-value"},
    )
    assert bad_resp.status_code == 403
    assert "Direct authentication bypass rejected" in bad_resp.json()["detail"]

    # Valid secret must succeed
    good_resp = await unauth_client.post(
        "/api/v1/auth/login",
        json={"email": "operator_test@insightflow.ai", "password": "TestPassword123!@"},
        headers={"X-BFF-Secret": settings.INSIGHTFLOW_BFF_SHARED_SECRET},
    )
    assert good_resp.status_code == 200
    assert "access_token" in good_resp.json()
