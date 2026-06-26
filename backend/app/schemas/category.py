from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: Literal["income", "expense"]
    icon: str = Field("ti-tag", max_length=100)
    color: str = Field("#7C3AED", max_length=20)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[Literal["income", "expense"]] = None
    icon: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=20)

class CategoryResponse(CategoryBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
