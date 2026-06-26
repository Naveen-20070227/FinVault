from datetime import date, datetime
from sqlalchemy import String, Numeric, ForeignKey, Date, CheckConstraint, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    target_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    saved_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    icon: Mapped[str] = mapped_column(String(100), default="ti-target")
    color: Mapped[str] = mapped_column(String(20), default="#7C3AED")
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # 'active', 'complete'

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="savings_goals")

    @property
    def progress_percent(self) -> float:
        target = float(self.target_amount)
        saved = float(self.saved_amount)
        return (saved / target) * 100 if target > 0 else 0.0

    @property
    def days_remaining(self) -> int:
        days_rem = (self.deadline - date.today()).days
        return max(0, days_rem)

    __table_args__ = (
        CheckConstraint("target_amount > 0", name="chk_goal_target_positive"),
        CheckConstraint("saved_amount >= 0", name="chk_goal_saved_nonnegative"),
        CheckConstraint("status IN ('active', 'complete')", name="chk_goal_status"),
        Index("ix_goals_user", "user_id"),
    )
