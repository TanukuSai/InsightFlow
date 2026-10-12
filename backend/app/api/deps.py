from typing import Optional, AsyncGenerator
from fastapi import Header, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import verify_token, AuthenticatedUser


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_workspace_id: Optional[str] = Header(None),
) -> AuthenticatedUser:
    return verify_token(authorization=authorization, x_workspace_id=x_workspace_id)


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncGenerator[AsyncSession, None]:
    yield db
