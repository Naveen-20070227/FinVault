from datetime import date, datetime
from sqlalchemy import String, Numeric, ForeignKey, Date, CheckConstraint, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'income' or 'expense'
    date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str] = mapped_column(String(1000), nullable=True)
    receipt_image: Mapped[str] = mapped_column(String(500), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="transactions")
    category: Mapped["Category"] = relationship(back_populates="transactions")

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_transaction_amount_positive"),
        CheckConstraint("type IN ('income', 'expense')", name="chk_transaction_type"),
        Index("ix_tx_user_date", "user_id", date.desc()),
        Index("ix_tx_user_type_date", "user_id", "type", date.desc()),
        Index("ix_tx_user_category", "user_id", "category_id"),
    )
