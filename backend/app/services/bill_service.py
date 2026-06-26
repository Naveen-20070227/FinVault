from datetime import date, timedelta
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundError, ValidationError
from app.models.bill import Bill
from app.models.transaction import Transaction
from app.repositories.bill_repo import BillRepository
from app.repositories.category_repo import CategoryRepository
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.notification_repo import NotificationRepository
from app.schemas.bill import BillCreate, BillUpdate, BillResponse

class BillService:
    def __init__(self, db: Session):
        self.db = db
        self.bill_repo = BillRepository(db)
        self.cat_repo = CategoryRepository(db)
        self.tx_repo = TransactionRepository(db)
        self.notif_repo = NotificationRepository(db)

    def get_by_id(self, bill_id: int, user_id: int) -> Bill:
        bill = self.bill_repo.get_by_id(bill_id)
        if not bill or bill.user_id != user_id:
            raise NotFoundError("Bill not found")
        return bill

    def _sync_and_map(self, user_id: int, bills: List[Bill]) -> List[BillResponse]:
        today = date.today()
        result = []
        
        for b in bills:
            # Auto-reset paid bills if due date is today or in past (recurrence handler)
            if b.status == "paid" and b.due_date <= today:
                b.status = "pending"
                self.bill_repo.update(b)

            is_overdue = (b.status == "pending" and b.due_date < today)
            
            category = self.cat_repo.get_by_id(b.category_id) if b.category_id else None

            result.append(
                BillResponse(
                    id=b.id,
                    user_id=b.user_id,
                    title=b.title,
                    amount=b.amount,
                    frequency=b.frequency,
                    due_date=b.due_date,
                    status=b.status,
                    category_id=b.category_id,
                    is_overdue=is_overdue,
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                    category=category
                )
            )
            
        return result

    def get_all(self, user_id: int) -> List[BillResponse]:
        bills = self.bill_repo.get_all_by_user(user_id)
        return self._sync_and_map(user_id, bills)

    def get_upcoming(self, user_id: int, days_limit: int = 7) -> List[BillResponse]:
        bills = self.bill_repo.get_upcoming_by_user(user_id, days_limit)
        return self._sync_and_map(user_id, bills)

    def create(self, user_id: int, bill_in: BillCreate) -> Bill:
        # Validate category if provided
        if bill_in.category_id:
            category = self.cat_repo.get_by_id(bill_in.category_id)
            if not category or category.user_id != user_id:
                raise ValidationError("Invalid category selected")
            if category.type != "expense":
                raise ValidationError("Bills can only be linked to expense categories")

        db_bill = Bill(
            user_id=user_id,
            category_id=bill_in.category_id,
            title=bill_in.title,
            amount=bill_in.amount,
            frequency=bill_in.frequency,
            due_date=bill_in.due_date,
            status=bill_in.status
        )
        return self.bill_repo.create(db_bill)

    def update(self, user_id: int, bill_id: int, bill_in: BillUpdate) -> Bill:
        bill = self.get_by_id(bill_id, user_id)
        update_data = bill_in.model_dump(exclude_unset=True)

        if "category_id" in update_data and update_data["category_id"]:
            category = self.cat_repo.get_by_id(update_data["category_id"])
            if not category or category.user_id != user_id:
                raise ValidationError("Invalid category selected")
            if category.type != "expense":
                raise ValidationError("Bills can only be linked to expense categories")

        for field, value in update_data.items():
            setattr(bill, field, value)

        return self.bill_repo.update(bill)

    def pay_bill(self, user_id: int, bill_id: int) -> Bill:
        bill = self.get_by_id(bill_id, user_id)
        
        # Idempotence Check
        if bill.status == "paid":
            raise ValidationError("Bill is already marked as paid")

        # Resolve category (default to Utilities or first expense category if not linked)
        category_id = bill.category_id
        if not category_id:
            utilities_cat = self.cat_repo.get_by_name_and_type(user_id, "Utilities", "expense")
            if utilities_cat:
                category_id = utilities_cat.id
            else:
                expense_cats = self.cat_repo.get_all_by_user(user_id, "expense")
                if expense_cats:
                    category_id = expense_cats[0].id
                else:
                    raise ValidationError("Please create at least one expense category before paying bills")

        # Create Transaction
        tx = Transaction(
            user_id=user_id,
            category_id=category_id,
            title=f"Paid Bill: {bill.title}",
            amount=bill.amount,
            type="expense",
            date=date.today(),
            notes=f"Automated payment for bill due on {bill.due_date}"
        )
        self.tx_repo.create(tx)

        # Mark paid & Advance due date
        bill.status = "paid"
        bill.due_date = self._calculate_next_due_date(bill.due_date, bill.frequency)
        return self.bill_repo.update(bill)

    def unpay_bill(self, user_id: int, bill_id: int) -> Bill:
        bill = self.get_by_id(bill_id, user_id)
        
        if bill.status == "pending":
            raise ValidationError("Bill is already pending")

        # Reverse due date to prior billing period
        bill.due_date = self._calculate_previous_due_date(bill.due_date, bill.frequency)
        bill.status = "pending"
        
        # Find and delete the auto-created transaction to fix balance discrepancy
        # Look for most recent matching paid transaction
        tx_pattern = f"Paid Bill: {bill.title}"
        matching_txs = self.tx_repo.get_all(
            user_id=user_id,
            search=tx_pattern,
            tx_type="expense",
            limit=5
        )
        for tx in matching_txs:
            if tx.amount == bill.amount and tx.title == tx_pattern:
                self.tx_repo.delete(tx)
                break

        return self.bill_repo.update(bill)

    def delete(self, user_id: int, bill_id: int) -> None:
        bill = self.get_by_id(bill_id, user_id)
        self.bill_repo.delete(bill)

    def _calculate_next_due_date(self, current_due: date, frequency: str) -> date:
        if frequency == "Weekly":
            return current_due + timedelta(days=7)
        elif frequency == "Monthly":
            # Add one month handling overflow
            next_month = current_due.month + 1
            year_offset = 0
            if next_month > 12:
                next_month = 1
                year_offset = 1
            # Handle month end day overflow (e.g. Jan 31 -> Feb 28)
            try:
                return date(current_due.year + year_offset, next_month, current_due.day)
            except ValueError:
                # Return last day of the next month
                if next_month == 2:
                    is_leap = (current_due.year + year_offset) % 4 == 0 and ((current_due.year + year_offset) % 100 != 0 or (current_due.year + year_offset) % 400 == 0)
                    return date(current_due.year + year_offset, 2, 29 if is_leap else 28)
                elif next_month in [4, 6, 9, 11]:
                    return date(current_due.year + year_offset, next_month, 30)
                return date(current_due.year + year_offset, next_month, 31)
        elif frequency == "Quarterly":
            # Add 3 months
            new_date = current_due
            for _ in range(3):
                new_date = self._calculate_next_due_date(new_date, "Monthly")
            return new_date
        elif frequency == "Yearly":
            try:
                return date(current_due.year + 1, current_due.month, current_due.day)
            except ValueError:
                # Feb 29 on leap year rollover
                return date(current_due.year + 1, 2, 28)
        return current_due

    def _calculate_previous_due_date(self, current_due: date, frequency: str) -> date:
        if frequency == "Weekly":
            return current_due - timedelta(days=7)
        elif frequency == "Monthly":
            prev_month = current_due.month - 1
            year_offset = 0
            if prev_month < 1:
                prev_month = 12
                year_offset = -1
            try:
                return date(current_due.year + year_offset, prev_month, current_due.day)
            except ValueError:
                if prev_month == 2:
                    is_leap = (current_due.year + year_offset) % 4 == 0 and ((current_due.year + year_offset) % 100 != 0 or (current_due.year + year_offset) % 400 == 0)
                    return date(current_due.year + year_offset, 2, 29 if is_leap else 28)
                elif prev_month in [4, 6, 9, 11]:
                    return date(current_due.year + year_offset, prev_month, 30)
                return date(current_due.year + year_offset, prev_month, 31)
        elif frequency == "Quarterly":
            new_date = current_due
            for _ in range(3):
                new_date = self._calculate_previous_due_date(new_date, "Monthly")
            return new_date
        elif frequency == "Yearly":
            try:
                return date(current_due.year - 1, current_due.month, current_due.day)
            except ValueError:
                # Feb 29 rollover
                return date(current_due.year - 1, 2, 28)
        return current_due
