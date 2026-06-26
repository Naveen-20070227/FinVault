from datetime import date
from typing import List , Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.budget import BudgetResponse, BudgetCreate, BudgetUpdate, BudgetWithSpent
from app.services.budget_service import BudgetService

router = APIRouter()

@router.get("/", response_model=List[BudgetWithSpent])
def list_budgets(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    m = month if month is not None else today.month
    y = year if year is not None else today.year
    
    budget_service = BudgetService(db)
    return budget_service.get_all(current_user.id, m, y)

@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budget_service = BudgetService(db)
    return budget_service.create_or_update(current_user.id, budget_in)

@router.put("/{id}", response_model=BudgetResponse)
def update_budget(
    id: int,
    budget_in: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budget_service = BudgetService(db)
    return budget_service.update(current_user.id, id, budget_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budget_service = BudgetService(db)
    budget_service.delete(current_user.id, id)
    return None
