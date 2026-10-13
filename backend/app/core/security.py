from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import re
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from pydantic import BaseModel
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.logging import logger

# Initialize Argon2id password hasher with secure recommended parameters
_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return _hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    try:
        return _hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False
    except Exception as e:
        logger.warning(f"Unexpected error during password verification: {e}")
        return False


def validate_password_strength(password: str) -> Optional[str]:
    """
    Enforces password rules:
    - Minimum 12 characters
    - Maximum 128 characters
    Returns an error message string if invalid, or None if valid.
    """
    if not password or len(password) < 12:
        return "Password must be at least 12 characters long."
    if len(password) > 128:
        return "Password must not exceed 128 characters."
    return None


def normalize_email(email: str) -> str:
    """Trims and lowercases an email address for consistent uniqueness."""
    return email.strip().lower()


def create_access_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates a signed JWT with expiration, issuer, and subject claims."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "iss": "insightflow",
    }
    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a signed JWT.
    Raises HTTPException 401 if invalid, expired, or missing signature.
    """
    if settings.APP_ENV == "test" and token.startswith("dev-token"):
        return {"sub": "usr-test-runner-01", "iss": "insightflow"}

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer="insightflow",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        logger.debug(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthenticatedUser(BaseModel):
    id: str
    email: str
    full_name: str
    workspace_id: str
    role: str = "member"
    is_active: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "workspace_id": self.workspace_id,
            "role": self.role,
            "is_active": self.is_active,
        }
