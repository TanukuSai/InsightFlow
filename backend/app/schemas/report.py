from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ReportCreateRequest(BaseModel):
    dataset_id: str
    title: Optional[str] = None
    format: str = Field(default="pdf", pattern="^(pdf|json|csv)$")


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    dataset_id: str
    title: str
    format: str
    status: str
    file_path: Optional[str] = None
    download_url: Optional[str] = None
    summary_data: Dict[str, Any]
    created_at: datetime
