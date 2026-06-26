from datetime import datetime
from sqlalchemy import Numeric, ForeignKey, CheckConstraint, UniqueConstraint, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    budget_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    month: Mapped[int] = mapped_column(nullable=False)
    year: Mapped[int] = mapped_column(nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="budgets")
    category: Mapped["Category"] = relationship(back_populates="budgets")

    __table_args__ = (
        CheckConstraint("budget_amount > 0", name="chk_budget_amount_positive"),
        CheckConstraint("month BETWEEN 1 AND 12", name="chk_budget_month_range"),
        CheckConstraint("year BETWEEN 2000 AND 2100", name="chk_budget_year_range"),
        UniqueConstraint("user_id", "category_id", "month", "year", name="uq_budgets_user_category_month_year"),
        Index("ix_budget_user_my", "user_id", "month", "year"),
    )
