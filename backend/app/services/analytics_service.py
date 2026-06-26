from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.budget import Budget
from app.models.goal import SavingsGoal
from app.models.bill import Bill
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.category_repo import CategoryRepository
from app.repositories.budget_repo import BudgetRepository
from app.repositories.goal_repo import GoalRepository
from app.repositories.bill_repo import BillRepository
from app.schemas.analytics import (
    DashboardOverview,
    CategoryBreakdown,
    MonthlyTrend,
    SavingsGrowth,
    BudgetPerformance,
)
from app.schemas.transaction import TransactionResponse
from app.schemas.bill import BillResponse

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.tx_repo = TransactionRepository(db)
        self.cat_repo = CategoryRepository(db)
        self.budget_repo = BudgetRepository(db)
        self.goal_repo = GoalRepository(db)
        self.bill_repo = BillRepository(db)

    def _get_month_range(self, year: int, month: int) -> Tuple[date, date]:
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)
        return start, end

    def get_dashboard_overview(self, user_id: int) -> DashboardOverview:
        today = date.today()
        start_month, end_month = self._get_month_range(today.year, today.month)

        # 1. Total Balance (All-Time Income - Expenses)
        total_income = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id, Transaction.type == "income"
        ).scalar() or Decimal("0.00")
        
        total_expense = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id, Transaction.type == "expense"
        ).scalar() or Decimal("0.00")
        
        total_balance = total_income - total_expense

        # 2. Monthly Income
        monthly_income = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income",
            Transaction.date >= start_month,
            Transaction.date < end_month
        ).scalar() or Decimal("0.00")

        # 3. Monthly Expenses
        monthly_expenses = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= start_month,
            Transaction.date < end_month
        ).scalar() or Decimal("0.00")

        # 4. Monthly Savings
        monthly_savings = monthly_income - monthly_expenses

        # 5. Budget Utilization % for current month (Bulk Query - No N+1!)
        budgets = self.budget_repo.get_all_by_user(user_id, today.month, today.year)
        total_budget_amount = sum(Decimal(str(b.budget_amount)) for b in budgets)
        
        # Get spent totals for all budgeted categories in one query
        budgeted_cat_ids = [b.category_id for b in budgets]
        total_budgeted_spent = Decimal("0.00")
        if budgeted_cat_ids:
            spent_sum = self.db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.category_id.in_(budgeted_cat_ids),
                Transaction.date >= start_month,
                Transaction.date < end_month
            ).scalar()
            total_budgeted_spent = Decimal(str(spent_sum)) if spent_sum else Decimal("0.00")

        budget_util_pct = float((total_budgeted_spent / total_budget_amount) * 100) if total_budget_amount > 0 else 0.0

        # 6. Active savings goals count
        active_goals_count = self.db.query(SavingsGoal).filter(
            SavingsGoal.user_id == user_id, SavingsGoal.status == "active"
        ).count()

        # 7. Upcoming bills count (Next 7 days)
        upcoming_bills = self.bill_repo.get_upcoming_by_user(user_id, 7)
        upcoming_bills_count = len(upcoming_bills)

        # Recent transactions (last 5)
        recent_txs = self.tx_repo.get_all(user_id, limit=5)
        recent_responses = []
        for tx in recent_txs:
            category = self.cat_repo.get_by_id(tx.category_id)
            recent_responses.append(
                TransactionResponse(
                    id=tx.id,
                    user_id=tx.user_id,
                    title=tx.title,
                    amount=tx.amount,
                    type=tx.type,
                    date=tx.date,
                    notes=tx.notes,
                    receipt_image=tx.receipt_image,
                    category_id=tx.category_id,
                    category=category,
                    created_at=tx.created_at,
                    updated_at=tx.updated_at
                )
            )

        # Upcoming bills (mapped)
        upcoming_mapped = []
        for b in upcoming_bills:
            category = self.cat_repo.get_by_id(b.category_id) if b.category_id else None
            upcoming_mapped.append(
                BillResponse(
                    id=b.id,
                    user_id=b.user_id,
                    title=b.title,
                    amount=b.amount,
                    frequency=b.frequency,
                    due_date=b.due_date,
                    status=b.status,
                    category_id=b.category_id,
                    is_overdue=b.due_date < today,
                    category=category,
                    created_at=b.created_at,
                    updated_at=b.updated_at
                )
            )

        return DashboardOverview(
            total_balance=total_balance,
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            monthly_savings=monthly_savings,
            budget_utilization_percent=budget_util_pct,
            active_goals_count=active_goals_count,
            upcoming_bills_count=upcoming_bills_count,
            recent_transactions=recent_responses,
            upcoming_bills=upcoming_mapped
        )

    def get_category_breakdown(self, user_id: int, month_str: Optional[str] = None) -> List[CategoryBreakdown]:
        today = date.today()
        if month_str:
            try:
                y, m = map(int, month_str.split("-"))
            except ValueError:
                y, m = today.year, today.month
        else:
            y, m = today.year, today.month

        start_month, end_month = self._get_month_range(y, m)

        # Get total expenses for the month
        total_expense = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= start_month,
            Transaction.date < end_month
        ).scalar() or Decimal("0.00")

        if total_expense == 0:
            return []

        # Get spent grouped by category
        spent_grouped = self.db.query(
            Transaction.category_id,
            func.sum(Transaction.amount).label("total_spent")
        ).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= start_month,
            Transaction.date < end_month
        ).group_by(Transaction.category_id).all()

        breakdown = []
        for cat_id, spent in spent_grouped:
            cat = self.cat_repo.get_by_id(cat_id)
            if cat:
                pct = float((spent / total_expense) * 100)
                breakdown.append(
                    CategoryBreakdown(
                        category_name=cat.name,
                        category_id=cat.id,
                        amount=spent,
                        percentage=pct,
                        color=cat.color
                    )
                )

        # Sort by amount descending
        breakdown.sort(key=lambda x: x.amount, reverse=True)
        return breakdown

    def get_monthly_trend(self, user_id: int) -> List[MonthlyTrend]:
        # Resolve 6 months (resolves Bug M1)
        today = date.today()
        current_year = today.year
        current_month = today.month

        months_list = []
        for i in range(5, -1, -1):
            m = current_month - i
            y = current_year
            while m <= 0:
                m += 12
                y -= 1
            months_list.append((y, m))

        trend = []
        for y, m in months_list:
            start_m, end_m = self._get_month_range(y, m)
            
            income = self.db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.type == "income",
                Transaction.date >= start_m,
                Transaction.date < end_m
            ).scalar() or Decimal("0.00")

            expense = self.db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.date >= start_m,
                Transaction.date < end_m
            ).scalar() or Decimal("0.00")

            month_label = date(y, m, 1).strftime("%b %Y")
            trend.append(
                MonthlyTrend(
                    month=month_label,
                    income=income,
                    expense=expense
                )
            )
            
        return trend

    def get_savings_growth(self, user_id: int) -> List[SavingsGrowth]:
        # 12-month savings growth (running cumulative savings)
        today = date.today()
        current_year = today.year
        current_month = today.month

        months_list = []
        for i in range(11, -1, -1):
            m = current_month - i
            y = current_year
            while m <= 0:
                m += 12
                y -= 1
            months_list.append((y, m))

        # First, calculate baseline cumulative savings prior to the 12-month window
        start_window_date = date(months_list[0][0], months_list[0][1], 1)
        
        prior_income = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income",
            Transaction.date < start_window_date
        ).scalar() or Decimal("0.00")

        prior_expense = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date < start_window_date
        ).scalar() or Decimal("0.00")

        cumulative_savings = prior_income - prior_expense
        growth = []

        for y, m in months_list:
            start_m, end_m = self._get_month_range(y, m)
            
            income = self.db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.type == "income",
                Transaction.date >= start_m,
                Transaction.date < end_m
            ).scalar() or Decimal("0.00")

            expense = self.db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.date >= start_m,
                Transaction.date < end_m
            ).scalar() or Decimal("0.00")

            saved = income - expense
            cumulative_savings += saved

            month_label = date(y, m, 1).strftime("%b %Y")
            growth.append(
                SavingsGrowth(
                    month=month_label,
                    saved_amount=saved,
                    cumulative_savings=cumulative_savings
                )
            )

        return growth

    def get_budget_performance(self, user_id: int) -> List[BudgetPerformance]:
        today = date.today()
        budgets = self.budget_repo.get_all_by_user(user_id, today.month, today.year)
        start_month, end_month = self._get_month_range(today.year, today.month)

        performance = []
        for b in budgets:
            category = self.cat_repo.get_by_id(b.category_id)
            if not category:
                continue

            spent = self.db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.category_id == b.category_id,
                Transaction.date >= start_month,
                Transaction.date < end_month
            ).scalar() or Decimal("0.00")

            budget_amt = Decimal(str(b.budget_amount))
            pct = float((spent / budget_amt) * 100) if budget_amt > 0 else 0.0

            performance.append(
                BudgetPerformance(
                    category_name=category.name,
                    budget_amount=budget_amt,
                    spent_amount=spent,
                    utilization_percent=pct,
                    color=category.color
                )
            )
            
        return performance
