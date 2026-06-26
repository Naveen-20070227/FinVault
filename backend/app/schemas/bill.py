from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.category import CategoryResponse

class BillBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., gt=0)
    frequency: Literal["Weekly", "Monthly", "Quarterly", "Yearly"]
    due_date: date
    status: Literal["pending", "paid"] = "pending"
    category_id: Optional[int] = None

class BillCreate(BillBase):
    pass

class BillUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[Decimal] = Field(None, gt=0)
    frequency: Optional[Literal["Weekly", "Monthly", "Quarterly", "Yearly"]] = None
    due_date: Optional[date] = None
    status: Optional[Literal["pending", "paid"]] = None
    category_id: Optional[int] = None

class BillResponse(BillBase):
    id: int
    user_id: int
    is_overdue: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True
