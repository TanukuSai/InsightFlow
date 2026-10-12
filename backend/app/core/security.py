from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger


class PublicDemoContext:
    """
    Authoritative server-side Public Demo Workspace context.
    InsightFlow operates as a public hackathon single-workspace demonstration.
    All operations bind unconditionally to settings.PUBLIC_DEMO_WORKSPACE_ID.
    Untrusted caller-supplied X-Workspace-Id or Authorization headers are not required
    and cannot be used to switch to unauthorized workspaces.
    """
    def __init__(self, workspace_id: Optional[str] = None):
        self.workspace_id = settings.PUBLIC_DEMO_WORKSPACE_ID
        self.user_id = "public-demo-user"
        self.role = "public-viewer"
        self.email = "demo@insightflow.ai"
        self.is_demo = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "role": self.role,
            "email": self.email,
            "is_demo": self.is_demo,
        }


# Maintain backward compatibility alias for existing route type annotations
AuthenticatedUser = PublicDemoContext


def verify_token(
    authorization: Optional[str] = None,
    x_workspace_id: Optional[str] = None,
) -> PublicDemoContext:
    """
    Returns the authoritative public demo context.
    No user login, password, JWT, or bearer token is required.
    Caller-supplied workspace headers are ignored and bound strictly to PUBLIC_DEMO_WORKSPACE_ID.
    """
    if x_workspace_id and x_workspace_id != settings.PUBLIC_DEMO_WORKSPACE_ID:
        logger.debug(
            f"Overriding caller workspace header '{x_workspace_id}' to authoritative demo workspace '{settings.PUBLIC_DEMO_WORKSPACE_ID}'"
        )
    return PublicDemoContext()


def get_demo_workspace() -> str:
    """Returns the configured public demo workspace identifier."""
    return settings.PUBLIC_DEMO_WORKSPACE_ID
