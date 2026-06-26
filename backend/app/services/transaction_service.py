import os
from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.notification import Notification
from app.models.budget import Budget
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.category_repo import CategoryRepository
from app.repositories.budget_repo import BudgetRepository
from app.repositories.notification_repo import NotificationRepository
from app.repositories.user_repo import UserRepository
from app.schemas.transaction import TransactionCreate, TransactionUpdate

class TransactionService:
    def __init__(self, db: Session):
        self.db = db
        self.tx_repo = TransactionRepository(db)
        self.cat_repo = CategoryRepository(db)
        self.budget_repo = BudgetRepository(db)
        self.notif_repo = NotificationRepository(db)
        self.user_repo = UserRepository(db)

    def get_by_id(self, transaction_id: int, user_id: int) -> Transaction:
        tx = self.tx_repo.get_by_id(transaction_id)
        if not tx or tx.user_id != user_id:
            raise NotFoundError("Transaction not found")
        return tx

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
    ) -> Tuple[List[Transaction], int]:
        txs = self.tx_repo.get_all(user_id, search, tx_type, category_id, month, sort_by, sort_order, skip, limit)
        total = self.tx_repo.get_count(user_id, search, tx_type, category_id, month)
        return txs, total

    def create(self, user_id: int, tx_in: TransactionCreate) -> Transaction:
        # Validate Category
        category = self.cat_repo.get_by_id(tx_in.category_id)
        if not category or category.user_id != user_id:
            raise ValidationError("Invalid category selected")

        # Enforce type match: Transaction type must match Category type
        if tx_in.type != category.type:
            raise ValidationError(f"Transaction type '{tx_in.type}' must match Category type '{category.type}'")

        db_tx = Transaction(
            user_id=user_id,
            category_id=tx_in.category_id,
            title=tx_in.title,
            amount=tx_in.amount,
            type=tx_in.type,
            date=tx_in.date,
            notes=tx_in.notes,
            receipt_image=tx_in.receipt_image
        )
        tx = self.tx_repo.create(db_tx)

        # Trigger Alerts
        user = self.user_repo.get_by_id(user_id)
        if user:
            self._check_large_expense_alert(user, tx)
            if tx.type == "expense":
                self._check_budget_alerts(user, tx.category_id, tx.date.month, tx.date.year)

        return tx

    def update(self, user_id: int, transaction_id: int, tx_in: TransactionUpdate) -> Transaction:
        tx = self.get_by_id(transaction_id, user_id)
        old_receipt = tx.receipt_image
        update_data = tx_in.model_dump(exclude_unset=True)

        # Handle Category Change
        category_id = update_data.get("category_id", tx.category_id)
        category = self.cat_repo.get_by_id(category_id)
        if not category or category.user_id != user_id:
            raise ValidationError("Invalid category selected")

        # Handle Type Change
        tx_type = update_data.get("type", tx.type)
        if tx_type != category.type:
            raise ValidationError(f"Transaction type '{tx_type}' must match Category type '{category.type}'")

        for field, value in update_data.items():
            setattr(tx, field, value)

        updated_tx = self.tx_repo.update(tx)

        # Delete old receipt image file if it was replaced
        if old_receipt and tx.receipt_image != old_receipt:
            self._delete_receipt_file(old_receipt)

        # Trigger Alerts
        user = self.user_repo.get_by_id(user_id)
        if user:
            self._check_large_expense_alert(user, updated_tx)
            if updated_tx.type == "expense":
                self._check_budget_alerts(user, updated_tx.category_id, updated_tx.date.month, updated_tx.date.year)

        return updated_tx

    def delete(self, user_id: int, transaction_id: int) -> None:
        tx = self.get_by_id(transaction_id, user_id)
        receipt_to_delete = tx.receipt_image
        cat_id = tx.category_id
        tx_month, tx_year = tx.date.month, tx.date.year

        self.tx_repo.delete(tx)

        # Delete receipt file from disk
        if receipt_to_delete:
            self._delete_receipt_file(receipt_to_delete)

        # Re-check budget state after deletion
        user = self.user_repo.get_by_id(user_id)
        if user and tx.type == "expense":
            self._check_budget_alerts(user, cat_id, tx_month, tx_year)

    def _delete_receipt_file(self, filename: str) -> None:
        path = os.path.join(settings.UPLOAD_DIR, filename)
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    def _check_large_expense_alert(self, user, tx: Transaction) -> None:
        if tx.type == "expense" and tx.amount >= Decimal(str(user.large_expense_threshold)):
            title = "Large Expense Detected"
            message = f"Expense transaction '{tx.title}' of amount {user.currency}{tx.amount:,.2f} exceeds your large expense threshold."
            
            # Simple dedup: don't create multiple identical notifications for the same transaction
            notif = Notification(
                user_id=user.id,
                type="large_expense",
                title=title,
                message=message
            )
            self.notif_repo.create(notif)

    def _check_budget_alerts(self, user, category_id: int, month: int, year: int) -> None:
        budget = self.budget_repo.get_by_category_and_date(user.id, category_id, month, year)
        if not budget:
            return

        category = self.cat_repo.get_by_id(category_id)
        if not category:
            return

        spent = self.tx_repo.get_total_spent_by_category_and_month(user.id, category_id, month, year)
        budget_amt = Decimal(str(budget.budget_amount))
        
        if budget_amt <= 0:
            return

        util_pct = (spent / budget_amt) * 100

        # Check milestones: 100%, 90%, 80% (or user warning percent)
        warning_threshold = user.budget_warning_percent
        milestones = [
            (Decimal("100"), "100%", "exceeded your total budget limit of"),
            (Decimal("90"), "90%", "used 90% of your budget limit of"),
            (Decimal(str(warning_threshold)), f"{warning_threshold}%", f"reached {warning_threshold}% of your budget limit of")
        ]

        for limit_val, limit_label, text_desc in milestones:
            if util_pct >= limit_val:
                # Deduplication logic: Check if we already notified the user for this milestone this month
                # Unique message identifier fragment: category name + limit label + month/year
                dedup_fragment = f"'{category.name}' has {text_desc} {user.currency}{budget_amt:,.2f} for {month}/{year}"
                
                # Check database for exact type and substring matching the current month/year and milestone
                if not self.notif_repo.has_notification_this_month(user.id, "budget_alert", f"'{category.name}' {text_desc}"):
                    notif = Notification(
                        user_id=user.id,
                        type="budget_alert",
                        title=f"Budget Alert: {category.name} ({limit_label})",
                        message=f"Your spending in '{category.name}' has {text_desc} {user.currency}{budget_amt:,.2f} for {month}/{year} (Spent: {user.currency}{spent:,.2f})."
                    )
                    self.notif_repo.create(notif)
                break  # Only trigger one warning level (the highest achieved one)
