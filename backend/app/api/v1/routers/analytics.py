from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    DashboardOverview,
    CategoryBreakdown,
    MonthlyTrend,
    SavingsGrowth,
    BudgetPerformance,
)
from app.schemas.transaction import TransactionResponse
from app.services.analytics_service import AnalyticsService
from app.services.transaction_service import TransactionService

router = APIRouter()

@router.get("/overview", response_model=DashboardOverview)
def get_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analytics_service = AnalyticsService(db)
    return analytics_service.get_dashboard_overview(current_user.id)

@router.get("/category-breakdown", response_model=List[CategoryBreakdown])
def get_category_breakdown(
    month: Optional[str] = Query(None, regex="^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analytics_service = AnalyticsService(db)
    return analytics_service.get_category_breakdown(current_user.id, month)

@router.get("/monthly-trend", response_model=List[MonthlyTrend])
def get_monthly_trend(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analytics_service = AnalyticsService(db)
    return analytics_service.get_monthly_trend(current_user.id)

@router.get("/savings-growth", response_model=List[SavingsGrowth])
def get_savings_growth(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analytics_service = AnalyticsService(db)
    return analytics_service.get_savings_growth(current_user.id)

@router.get("/top-expenses", response_model=List[TransactionResponse])
def get_top_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_service = TransactionService(db)
    txs, _ = tx_service.get_all(
        user_id=current_user.id,
        tx_type="expense",
        sort_by="amount",
        sort_order="desc",
        limit=5
    )
    return txs

@router.get("/budget-performance", response_model=List[BudgetPerformance])
def get_budget_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analytics_service = AnalyticsService(db)
    return analytics_service.get_budget_performance(current_user.id)
