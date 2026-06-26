from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.goal import SavingsGoal

class GoalRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, goal_id: int) -> Optional[SavingsGoal]:
        return self.db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()

    def get_all_by_user(self, user_id: int) -> List[SavingsGoal]:
        return self.db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id).order_by(SavingsGoal.deadline.asc()).all()

    def create(self, goal: SavingsGoal) -> SavingsGoal:
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def update(self, goal: SavingsGoal) -> SavingsGoal:
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def delete(self, goal: SavingsGoal) -> None:
        self.db.delete(goal)
        self.db.commit()
