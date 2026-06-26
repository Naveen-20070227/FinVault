from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.budget import Budget

class BudgetRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, budget_id: int) -> Optional[Budget]:
        return self.db.query(Budget).filter(Budget.id == budget_id).first()

    def get_by_category_and_date(
        self, user_id: int, category_id: int, month: int, year: int
    ) -> Optional[Budget]:
        return self.db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.month == month,
            Budget.year == year
        ).first()

    def get_all_by_user(self, user_id: int, month: int, year: int) -> List[Budget]:
        return self.db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == month,
            Budget.year == year
        ).all()

    def create(self, budget: Budget) -> Budget:
        self.db.add(budget)
        self.db.commit()
        self.db.refresh(budget)
        return budget

    def update(self, budget: Budget) -> Budget:
        self.db.commit()
        self.db.refresh(budget)
        return budget

    def delete(self, budget: Budget) -> None:
        self.db.delete(budget)
        self.db.commit()
