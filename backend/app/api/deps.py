from typing import Optional, AsyncGenerator
from fastapi import Header, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.security import decode_access_token, AuthenticatedUser
from app.models.user import User


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncGenerator[AsyncSession, None]:
    yield db


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_workspace_id: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
) -> AuthenticatedUser:
    """
    Parses and validates the Bearer JWT token from the Authorization header,
    loads the active User record from the database, and derives their authoritative workspace.
    Fails closed with HTTP 401 if missing, malformed, or expired.
    Untrusted caller-supplied X-Workspace-Id headers are ignored and cannot switch workspace.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims: missing subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token does not exist.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Access denied.",
        )

    return AuthenticatedUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        workspace_id=user.workspace_id,
        role=user.role,
        is_active=user.is_active,
    )
