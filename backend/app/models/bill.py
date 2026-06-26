from datetime import date, datetime
from sqlalchemy import String, Numeric, ForeignKey, Date, CheckConstraint, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False)  # 'Weekly', 'Monthly', 'Quarterly', 'Yearly'
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # 'pending', 'paid'

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="bills")
    category: Mapped["Category"] = relationship(back_populates="bills")

    @property
    def is_overdue(self) -> bool:
        return self.status == "pending" and self.due_date < date.today()

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_bill_amount_positive"),
        CheckConstraint("frequency IN ('Weekly', 'Monthly', 'Quarterly', 'Yearly')", name="chk_bill_frequency"),
        CheckConstraint("status IN ('pending', 'paid')", name="chk_bill_status"),
        Index("ix_bills_user_status_due", "user_id", "status", "due_date"),
    )
