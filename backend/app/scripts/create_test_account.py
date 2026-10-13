import asyncio
import argparse
import secrets
import string
import sys
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import async_engine, AsyncSessionLocal
from app.db.migrations import init_db
from app.models.user import User
from app.models.workspace import Workspace
from app.core.security import hash_password, verify_password, normalize_email
from app.core.config import settings
from app.db.seed import seed_canonical_dataset_if_needed


def generate_secure_password(length: int = 16) -> str:
    """Generates a cryptographically strong temporary password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least 1 lower, 1 upper, 1 digit, 1 special
    pwd = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]
    pwd += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


async def create_or_verify_account(
    email: str,
    password: str = None,
    full_name: str = "Test Account",
    claim_legacy_workspace: bool = False,
    seed_data: bool = False,
    reset_password: bool = False,
):
    await init_db()

    norm_email = normalize_email(email)
    generated_pwd = None
    if not password:
        generated_pwd = generate_secure_password(16)
        active_password = generated_pwd
    else:
        active_password = password

    async with AsyncSessionLocal() as db:
        # Check if user already exists
        user_stmt = select(User).where(User.email == norm_email)
        existing_user = (await db.execute(user_stmt)).scalar_one_or_none()

        if existing_user:
            if reset_password:
                existing_user.hashed_password = hash_password(active_password)
                existing_user.updated_at = datetime.now(timezone.utc)
                await db.commit()
                print(f"[TEST ACCOUNT] Password reset successfully for existing account: {norm_email}")
                print(f"[TEST ACCOUNT] Workspace: {existing_user.workspace_id}")
                if generated_pwd:
                    print(f"[TEST ACCOUNT] New Temporary Password: {generated_pwd}")
                return existing_user.workspace_id, active_password
            else:
                print(f"[TEST ACCOUNT] Account already exists: {norm_email} (Workspace ID: {existing_user.workspace_id})")
                print("[TEST ACCOUNT] Existing password preserved. Use --reset-password to update.")
                return existing_user.workspace_id, None

        # Determine target workspace
        if claim_legacy_workspace:
            legacy_ws_id = settings.PUBLIC_DEMO_WORKSPACE_ID
            # Check if another account owns legacy_ws_id
            owner_stmt = select(User).where(User.workspace_id == legacy_ws_id)
            existing_owner = (await db.execute(owner_stmt)).scalar_one_or_none()
            if existing_owner and existing_owner.email != norm_email:
                print(
                    f"[ERROR] Cannot claim legacy workspace '{legacy_ws_id}': already owned by '{existing_owner.email}'."
                )
                sys.exit(1)

            # Ensure workspace record exists
            ws_stmt = select(Workspace).where(Workspace.id == legacy_ws_id)
            ws = (await db.execute(ws_stmt)).scalar_one_or_none()
            if not ws:
                ws = Workspace(
                    id=legacy_ws_id,
                    name="Evaluation Workspace",
                    created_at=datetime.now(timezone.utc),
                )
                db.add(ws)
                await db.flush()
            target_workspace_id = legacy_ws_id
        else:
            target_workspace_id = f"ws-{uuid.uuid4().hex[:12]}"
            ws = Workspace(
                id=target_workspace_id,
                name=f"{full_name}'s Workspace",
                created_at=datetime.now(timezone.utc),
            )
            db.add(ws)
            await db.flush()

        # Create User
        hashed = hash_password(active_password)
        user = User(
            id=f"usr-{uuid.uuid4().hex[:12]}",
            email=norm_email,
            hashed_password=hashed,
            full_name=full_name,
            workspace_id=target_workspace_id,
            role="owner",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Verify password immediately
        assert verify_password(active_password, user.hashed_password), "Argon2 password self-verification failed!"

        # Seed sample data if requested
        if seed_data:
            print(f"[TEST ACCOUNT] Seeding canonical sample dataset into workspace {target_workspace_id}...")
            await seed_canonical_dataset_if_needed(db, workspace_id=target_workspace_id)

        print("=" * 60)
        print("INSIGHTFLOW TEST ACCOUNT PROVISIONED SUCCESSFULLY")
        print("=" * 60)
        print(f"User ID:            {user.id}")
        print(f"Email:              {user.email}")
        print(f"Workspace ID:       {user.workspace_id}")
        if generated_pwd:
            print(f"Temporary Password: {generated_pwd}")
        print(f"Verification:       Argon2id Hash Verified")
        print(f"Target Database:    {settings.DATABASE_URL}")
        print("=" * 60)

        return target_workspace_id, active_password


def main():
    parser = argparse.ArgumentParser(description="Provision an isolated InsightFlow operator test account.")
    parser.add_argument("--email", type=str, default="test@insightflow.ai", help="Operator account email")
    parser.add_argument("--password", type=str, default=None, help="Explicit password (if omitted, a secure 16-char password is generated)")
    parser.add_argument("--full-name", type=str, default="InsightFlow Test Operator", help="Operator display name")
    parser.add_argument(
        "--claim-legacy-demo-workspace",
        action="store_true",
        help="Associate the legacy demo workspace (ws-production-eval) if unowned",
    )
    parser.add_argument(
        "--seed-sample-data",
        action="store_true",
        help="Seed canonical customer feedback dataset if not already present",
    )
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Reset password if the account already exists",
    )

    args = parser.parse_args()

    asyncio.run(
        create_or_verify_account(
            email=args.email,
            password=args.password,
            full_name=args.full_name,
            claim_legacy_workspace=args.claim_legacy_demo_workspace,
            seed_data=args.seed_sample_data,
            reset_password=args.reset_password,
        )
    )


if __name__ == "__main__":
    main()
