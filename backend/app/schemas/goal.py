from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, Field

class SavingsGoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    target_amount: Decimal = Field(..., gt=0)
    saved_amount: Decimal = Field(default=0.00, ge=0)
    deadline: date
    icon: str = Field("ti-target", max_length=100)
    color: str = Field("#7C3AED", max_length=20)
    status: Literal["active", "complete"] = "active"

class SavingsGoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    target_amount: Decimal = Field(..., gt=0)
    deadline: date
    icon: str = Field("ti-target", max_length=100)
    color: str = Field("#7C3AED", max_length=20)

class SavingsGoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    target_amount: Optional[Decimal] = Field(None, gt=0)
    saved_amount: Optional[Decimal] = Field(None, ge=0)
    deadline: Optional[date] = None
    icon: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=20)
    status: Optional[Literal["active", "complete"]] = None

class SavingsGoalContribute(BaseModel):
    amount: Decimal = Field(..., gt=0)

class SavingsGoalResponse(SavingsGoalBase):
    id: int
    user_id: int
    progress_percent: float
    days_remaining: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
