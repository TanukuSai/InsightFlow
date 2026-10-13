import secrets
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_session, get_current_user
from app.core.config import settings
from app.core.rate_limit import rate_limit_auth
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    normalize_email,
    create_access_token,
    AuthenticatedUser,
)
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def verify_bff_secret(request: Request):
    """
    Enforces that authentication endpoints can only be invoked by the trusted
    same-origin Next.js BFF server, preventing browser bypasses from obtaining JWTs directly.
    """
    if settings.APP_ENV == "test" and "x-bff-secret" not in request.headers:
        return
    provided = request.headers.get("x-bff-secret", "")
    if not provided or not secrets.compare_digest(provided, settings.INSIGHTFLOW_BFF_SHARED_SECRET):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Direct authentication bypass rejected. Requests must originate through application BFF.",
        )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_session),
    _rate_limit: None = Depends(rate_limit_auth),
    _bff: None = Depends(verify_bff_secret),
):
    """
    Registers a new user account, creates an isolated dedicated Workspace for them,
    and returns a signed Bearer JWT token.
    """
    # 1. Validate password strength
    password_err = validate_password_strength(payload.password)
    if password_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=password_err,
        )

    # 2. Normalize email
    normalized = normalize_email(str(payload.email))

    # 3. Check for existing email collision
    existing_stmt = select(User).where(User.email == normalized)
    existing_user = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # 4. Create new isolated workspace for user
    workspace_id = f"ws-{uuid.uuid4().hex[:12]}"
    workspace = Workspace(
        id=workspace_id,
        name=f"{payload.full_name.strip()}'s Workspace",
        created_at=datetime.now(timezone.utc),
    )
    db.add(workspace)
    await db.flush()

    # 5. Create user entity with Argon2id hash
    user_id = f"usr-{uuid.uuid4().hex[:12]}"
    hashed = hash_password(payload.password)
    user = User(
        id=user_id,
        email=normalized,
        hashed_password=hashed,
        full_name=payload.full_name.strip(),
        workspace_id=workspace.id,
        role="owner",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 6. Generate signed JWT
    token = create_access_token(
        subject=user.id,
        extra_claims={
            "email": user.email,
            "workspace_id": user.workspace_id,
        },
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_session),
    _rate_limit: None = Depends(rate_limit_auth),
    _bff: None = Depends(verify_bff_secret),
):
    """
    Authenticates user credentials against Argon2id hash and issues a signed Bearer JWT.
    Returns generic 401 on incorrect credentials without revealing email presence.
    """
    normalized = normalize_email(payload.email)

    stmt = select(User).where(User.email == normalized)
    user = (await db.execute(stmt)).scalar_one_or_none()

    # Generic credential rejection
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Please contact support.",
        )

    token = create_access_token(
        subject=user.id,
        extra_claims={
            "email": user.email,
            "workspace_id": user.workspace_id,
        },
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Returns the authenticated user's profile and active workspace context.
    """
    stmt = select(User).where(User.id == current_user.id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found.",
        )
    return UserResponse.model_validate(user)
