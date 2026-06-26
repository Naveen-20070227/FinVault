from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.category import CategoryResponse

class TransactionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., gt=0)
    type: Literal["income", "expense"]
    date: date
    notes: Optional[str] = Field(None, max_length=1000)
    receipt_image: Optional[str] = Field(None, max_length=500)
    category_id: int

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[Decimal] = Field(None, gt=0)
    type: Optional[Literal["income", "expense"]] = None
    date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=1000)
    receipt_image: Optional[str] = Field(None, max_length=500)
    category_id: Optional[int] = None

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True
