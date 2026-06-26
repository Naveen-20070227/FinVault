from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.budget import Budget

class CategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, category_id: int) -> Optional[Category]:
        return self.db.query(Category).filter(Category.id == category_id).first()

    def get_by_name_and_type(self, user_id: int, name: str, cat_type: str) -> Optional[Category]:
        return self.db.query(Category).filter(
            Category.user_id == user_id,
            Category.name == name,
            Category.type == cat_type
        ).first()

    def get_all_by_user(self, user_id: int, cat_type: Optional[str] = None) -> List[Category]:
        query = self.db.query(Category).filter(Category.user_id == user_id)
        if cat_type:
            query = query.filter(Category.type == cat_type)
        return query.order_by(Category.name.asc()).all()

    def create(self, category: Category) -> Category:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update(self, category: Category) -> Category:
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category: Category) -> None:
        self.db.delete(category)
        self.db.commit()

    def has_transactions(self, category_id: int) -> bool:
        return self.db.query(Transaction).filter(Transaction.category_id == category_id).first() is not None

    def has_budgets(self, category_id: int) -> bool:
        return self.db.query(Budget).filter(Budget.category_id == category_id).first() is not None
