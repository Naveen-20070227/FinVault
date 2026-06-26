from datetime import datetime
from typing import List
from sqlalchemy import String, ForeignKey, UniqueConstraint, CheckConstraint, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'income' or 'expense'
    icon: Mapped[str] = mapped_column(String(100), default="ti-tag")
    color: Mapped[str] = mapped_column(String(20), default="#7C3AED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="categories")
    transactions: Mapped[List["Transaction"]] = relationship(
        back_populates="category", 
        cascade="all, delete-orphan", # Wait! The SRS says category delete is RESTRICTED if it has transactions, but we enforce that in the service/repo level. In DB we can set ON DELETE RESTRICT on transactions table category_id! So category relationship should not cascade-delete transactions if we want RESTRICT, or we can use PassiveDeletes. Let's make category_id in Transaction ON DELETE RESTRICT.
        passive_deletes=True
    )
    budgets: Mapped[List["Budget"]] = relationship(back_populates="category", cascade="all, delete-orphan")
    bills: Mapped[List["Bill"]] = relationship(back_populates="category")

    __table_args__ = (
        UniqueConstraint("user_id", "name", "type", name="uq_categories_user_name_type"),
        CheckConstraint("type IN ('income', 'expense')", name="chk_category_type"),
    )
