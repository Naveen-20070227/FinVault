from datetime import date
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundError, ValidationError
from app.models.budget import Budget
from app.repositories.budget_repo import BudgetRepository
from app.repositories.category_repo import CategoryRepository
from app.repositories.transaction_repo import TransactionRepository
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetWithSpent

class BudgetService:
    def __init__(self, db: Session):
        self.db = db
        self.budget_repo = BudgetRepository(db)
        self.cat_repo = CategoryRepository(db)
        self.tx_repo = TransactionRepository(db)

    def get_by_id(self, budget_id: int, user_id: int) -> Budget:
        budget = self.budget_repo.get_by_id(budget_id)
        if not budget or budget.user_id != user_id:
            raise NotFoundError("Budget not found")
        return budget

    def get_all(self, user_id: int, month: int, year: int) -> List[BudgetWithSpent]:
        budgets = self.budget_repo.get_all_by_user(user_id, month, year)
        result = []
        for b in budgets:
            spent = self.tx_repo.get_total_spent_by_category_and_month(user_id, b.category_id, month, year)
            budget_amt = Decimal(str(b.budget_amount))
            remaining = budget_amt - spent
            
            util_pct = float((spent / budget_amt) * 100) if budget_amt > 0 else 0.0
            
            # Map Category
            category = self.cat_repo.get_by_id(b.category_id)

            result.append(
                BudgetWithSpent(
                    id=b.id,
                    user_id=b.user_id,
                    category_id=b.category_id,
                    budget_amount=b.budget_amount,
                    month=b.month,
                    year=b.year,
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                    spent=spent,
                    remaining=remaining,
                    utilization_percent=util_pct,
                    category=category
                )
            )
        return result

    def create_or_update(self, user_id: int, budget_in: BudgetCreate) -> Budget:
        # Validate category is an expense category
        category = self.cat_repo.get_by_id(budget_in.category_id)
        if not category or category.user_id != user_id:
            raise ValidationError("Invalid category selected")
            
        if category.type != "expense":
            raise ValidationError("Budgets can only be set for expense categories")

        # Check existing budget for upsert
        existing = self.budget_repo.get_by_category_and_date(
            user_id, budget_in.category_id, budget_in.month, budget_in.year
        )

        if existing:
            existing.budget_amount = budget_in.budget_amount
            return self.budget_repo.update(existing)
        else:
            db_budget = Budget(
                user_id=user_id,
                category_id=budget_in.category_id,
                budget_amount=budget_in.budget_amount,
                month=budget_in.month,
                year=budget_in.year
            )
            return self.budget_repo.create(db_budget)

    def update(self, user_id: int, budget_id: int, budget_in: BudgetUpdate) -> Budget:
        budget = self.get_by_id(budget_id, user_id)
        budget.budget_amount = budget_in.budget_amount
        return self.budget_repo.update(budget)

    def delete(self, user_id: int, budget_id: int) -> None:
        budget = self.get_by_id(budget_id, user_id)
        self.budget_repo.delete(budget)
