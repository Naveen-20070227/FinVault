from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.bill import Bill

class BillRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, bill_id: int) -> Optional[Bill]:
        return self.db.query(Bill).filter(Bill.id == bill_id).first()

    def get_all_by_user(self, user_id: int) -> List[Bill]:
        return self.db.query(Bill).filter(Bill.user_id == user_id).order_by(Bill.due_date.asc()).all()

    def get_upcoming_by_user(self, user_id: int, days_limit: int = 7) -> List[Bill]:
        today = date.today()
        end_limit = today + timedelta(days=days_limit)
        return self.db.query(Bill).filter(
            Bill.user_id == user_id,
            Bill.status == "pending",
            Bill.due_date >= today,
            Bill.due_date <= end_limit
        ).order_by(Bill.due_date.asc()).all()

    def create(self, bill: Bill) -> Bill:
        self.db.add(bill)
        self.db.commit()
        self.db.refresh(bill)
        return bill

    def update(self, bill: Bill) -> Bill:
        self.db.commit()
        self.db.refresh(bill)
        return bill

    def delete(self, bill: Bill) -> None:
        self.db.delete(bill)
        self.db.commit()
