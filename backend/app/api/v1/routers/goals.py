from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.goal import SavingsGoalResponse, SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalContribute
from app.services.goal_service import GoalService

router = APIRouter()

@router.get("/", response_model=List[SavingsGoalResponse])
def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal_service = GoalService(db)
    return goal_service.get_all(current_user.id)

@router.post("/", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: SavingsGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal_service = GoalService(db)
    return goal_service.create(current_user.id, goal_in)

@router.put("/{id}", response_model=SavingsGoalResponse)
def update_goal(
    id: int,
    goal_in: SavingsGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal_service = GoalService(db)
    return goal_service.update(current_user.id, id, goal_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal_service = GoalService(db)
    goal_service.delete(current_user.id, id)
    return None

@router.post("/{id}/contribute", response_model=SavingsGoalResponse)
def contribute_to_goal(
    id: int,
    contrib: SavingsGoalContribute,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal_service = GoalService(db)
    return goal_service.contribute(current_user.id, id, contrib.amount)
