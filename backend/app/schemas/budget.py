from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.category import CategoryResponse

class BudgetBase(BaseModel):
    category_id: int
    budget_amount: Decimal = Field(..., gt=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    budget_amount: Decimal = Field(..., gt=0)

class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BudgetWithSpent(BudgetResponse):
    spent: Decimal
    remaining: Decimal
    utilization_percent: float
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True
