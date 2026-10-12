from typing import TypeVar, Generic, List, Optional, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="1-based page number")
    page_size: int = Field(default=50, ge=1, le=500, description="Items per page")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None
