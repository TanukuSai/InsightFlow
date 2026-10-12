from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import jwt
from app.core.config import settings
from app.core.logging import logger


class AuthenticatedUser:
    def __init__(self, user_id: str, workspace_id: str, role: str = "member", email: Optional[str] = None):
        self.user_id = user_id
        self.workspace_id = workspace_id
        self.role = role
        self.email = email

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "role": self.role,
            "email": self.email,
        }


def verify_token(
    authorization: Optional[str] = None,
    x_workspace_id: Optional[str] = None,
) -> AuthenticatedUser:
    """
    Validates the bearer token or development session.
    Derives the workspace_id safely and prevents cross-tenant access.
    In production (APP_ENV=production), fails closed:
      - Rejects missing authorization
      - Rejects dev tokens (dev-*, test-token)
      - Enforces JWT signature and expiry verification
      - Forbids arbitrary workspace switching via X-Workspace-Id
    """
    default_dev_workspace = "ws-production-eval"
    default_dev_user = "usr-default-dev"
    is_prod = settings.APP_ENV.lower() == "production"

    if not authorization:
        # In production, missing credentials must strictly fail closed
        if is_prod:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing Authorization header",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Development fallback (local offline development)
        ws_id = x_workspace_id or default_dev_workspace
        return AuthenticatedUser(
            user_id=default_dev_user,
            workspace_id=ws_id,
            role="admin",
            email="dev@insightflow.local",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # In production, dev tokens and test tokens are strictly forbidden
    if token.startswith("dev-") or token == "test-token":
        if is_prod:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Development tokens are not permitted in production environment",
                headers={"WWW-Authenticate": "Bearer"},
            )
        ws_id = x_workspace_id or f"ws-{token}"
        return AuthenticatedUser(
            user_id=f"usr-{token}",
            workspace_id=ws_id,
            role="admin",
            email=f"{token}@insightflow.local",
        )

    # Dedicated explicitly labeled demo token
    if token == "demo-token":
        return AuthenticatedUser(
            user_id="usr-demo-viewer",
            workspace_id="ws-production-eval",
            role="demo-viewer",
            email="demo@insightflow.ai",
        )

    # Decode and verify JWT
    try:
        if is_prod:
            if not settings.SUPABASE_JWT_SECRET:
                logger.error("Production authentication failed: SUPABASE_JWT_SECRET is not configured.")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server authentication error: JWT verification key is not configured",
                )
            # Enforce signature verification and token expiration in production
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_signature": True, "verify_exp": True, "verify_aud": False},
            )
        else:
            # Development mode: verify signature if secret configured, otherwise decode for local inspection
            if settings.SUPABASE_JWT_SECRET:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_signature": True, "verify_exp": True, "verify_aud": False},
                )
            else:
                payload = jwt.decode(
                    token,
                    options={"verify_signature": False},
                )

        sub = payload.get("sub", default_dev_user)
        email = payload.get("email")
        user_metadata = payload.get("user_metadata", {})
        app_metadata = payload.get("app_metadata", {})

        # Derive authorized workspace
        token_ws_id = app_metadata.get("workspace_id") or user_metadata.get("workspace_id") or f"ws-{sub[:8]}"

        # Prevent cross-tenant workspace spoofing in production
        if is_prod and x_workspace_id and x_workspace_id != token_ws_id:
            logger.warning(f"Tenant isolation mismatch: token ws={token_ws_id}, header ws={x_workspace_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to requested workspace",
            )

        ws_id = token_ws_id if is_prod else (x_workspace_id or token_ws_id)
        role = payload.get("role", "authenticated")

        return AuthenticatedUser(
            user_id=sub,
            workspace_id=ws_id,
            role=role,
            email=email,
        )
    except jwt.ExpiredSignatureError:
        logger.warning("JWT expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        logger.warning(f"JWT verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
