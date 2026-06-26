from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    currency: Optional[str] = Field(None, max_length=10)
    theme: Optional[str] = Field(None, max_length=20)
    large_expense_threshold: Optional[float] = Field(None, gt=0)
    budget_warning_percent: Optional[int] = Field(None, ge=1, le=100)

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: int
    profile_image: Optional[str] = None
    is_active: bool
    currency: str
    theme: str
    large_expense_threshold: float
    budget_warning_percent: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    token_type: Optional[str] = None  # 'access' or 'refresh'
