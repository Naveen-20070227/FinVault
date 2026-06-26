from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.models.category import Category

class TransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, transaction_id: int) -> Optional[Transaction]:
        return self.db.query(Transaction).filter(Transaction.id == transaction_id).first()

    def _apply_filters(
        self,
        user_id: int,
        search: Optional[str] = None,
        tx_type: Optional[str] = None,
        category_id: Optional[int] = None,
        month: Optional[str] = None  # Format: YYYY-MM
    ):
        query = self.db.query(Transaction).filter(Transaction.user_id == user_id)

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Transaction.title.ilike(search_pattern),
                    Transaction.notes.ilike(search_pattern)
                )
            )

        if tx_type:
            query = query.filter(Transaction.type == tx_type)

        if category_id:
            query = query.filter(Transaction.category_id == category_id)

        if month:
            try:
                year, m = map(int, month.split("-"))
                start_date = date(year, m, 1)
                # Next month start
                if m == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, m + 1, 1)
                query = query.filter(Transaction.date >= start_date, Transaction.date < end_date)
            except ValueError:
                pass  # Ignore invalid month format

        return query

    def get_all(
        self,
        user_id: int,
        search: Optional[str] = None,
        tx_type: Optional[str] = None,
        category_id: Optional[int] = None,
        month: Optional[str] = None,
        sort_by: str = "date",
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 50
    ) -> List[Transaction]:
        query = self._apply_filters(user_id, search, tx_type, category_id, month)

        # Sort mapping
        sort_col = Transaction.date
        if sort_by == "amount":
            sort_col = Transaction.amount
        elif sort_by == "title":
            sort_col = Transaction.title

        if sort_order == "asc":
            query = query.order_by(sort_col.asc(), Transaction.id.asc())
        else:
            query = query.order_by(sort_col.desc(), Transaction.id.desc())

        return query.offset(skip).limit(limit).all()

    def get_count(
        self,
        user_id: int,
        search: Optional[str] = None,
        tx_type: Optional[str] = None,
        category_id: Optional[int] = None,
        month: Optional[str] = None
    ) -> int:
        query = self._apply_filters(user_id, search, tx_type, category_id, month)
        return query.count()

    def create(self, transaction: Transaction) -> Transaction:
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def update(self, transaction: Transaction) -> Transaction:
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def delete(self, transaction: Transaction) -> None:
        self.db.delete(transaction)
        self.db.commit()

    def get_total_spent_by_category_and_month(
        self, user_id: int, category_id: int, month: int, year: int
    ) -> Decimal:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

        result = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.category_id == category_id,
            Transaction.type == "expense",
            Transaction.date >= start_date,
            Transaction.date < end_date
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
