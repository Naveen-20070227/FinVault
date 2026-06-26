from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.transaction import TransactionResponse
from app.schemas.bill import BillResponse

class DashboardOverview(BaseModel):
    total_balance: Decimal
    monthly_income: Decimal
    monthly_expenses: Decimal
    monthly_savings: Decimal
    budget_utilization_percent: float
    active_goals_count: int
    upcoming_bills_count: int
    recent_transactions: List[TransactionResponse]
    upcoming_bills: List[BillResponse]

class CategoryBreakdown(BaseModel):
    category_name: str
    category_id: int
    amount: Decimal
    percentage: float
    color: str

class MonthlyTrend(BaseModel):
    month: str  # e.g., 'Jan 2026' or '2026-01'
    income: Decimal
    expense: Decimal

class SavingsGrowth(BaseModel):
    month: str
    saved_amount: Decimal
    cumulative_savings: Decimal

class BudgetPerformance(BaseModel):
    category_name: str
    budget_amount: Decimal
    spent_amount: Decimal
    utilization_percent: float
    color: str
