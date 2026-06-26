from datetime import date
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundError, ValidationError
from app.models.goal import SavingsGoal
from app.models.notification import Notification
from app.repositories.goal_repo import GoalRepository
from app.repositories.notification_repo import NotificationRepository
from app.schemas.goal import SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalResponse

class GoalService:
    def __init__(self, db: Session):
        self.db = db
        self.goal_repo = GoalRepository(db)
        self.notif_repo = NotificationRepository(db)

    def get_by_id(self, goal_id: int, user_id: int) -> SavingsGoal:
        goal = self.goal_repo.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise NotFoundError("Savings goal not found")
        return goal

    def get_all(self, user_id: int) -> List[SavingsGoalResponse]:
        goals = self.goal_repo.get_all_by_user(user_id)
        today = date.today()
        result = []
        for g in goals:
            target = Decimal(str(g.target_amount))
            saved = Decimal(str(g.saved_amount))
            progress = float((saved / target) * 100) if target > 0 else 0.0
            
            days_rem = (g.deadline - today).days
            if days_rem < 0:
                days_rem = 0

            result.append(
                SavingsGoalResponse(
                    id=g.id,
                    user_id=g.user_id,
                    title=g.title,
                    target_amount=g.target_amount,
                    saved_amount=g.saved_amount,
                    deadline=g.deadline,
                    icon=g.icon,
                    color=g.color,
                    status=g.status,
                    progress_percent=progress,
                    days_remaining=days_rem,
                    created_at=g.created_at,
                    updated_at=g.updated_at
                )
            )
        return result

    def create(self, user_id: int, goal_in: SavingsGoalCreate) -> SavingsGoal:
        if goal_in.deadline < date.today():
            raise ValidationError("Deadline cannot be in the past")

        db_goal = SavingsGoal(
            user_id=user_id,
            title=goal_in.title,
            target_amount=goal_in.target_amount,
            deadline=goal_in.deadline,
            icon=goal_in.icon,
            color=goal_in.color,
            saved_amount=Decimal("0.00"),
            status="active"
        )
        return self.goal_repo.create(db_goal)

    def update(self, user_id: int, goal_id: int, goal_in: SavingsGoalUpdate) -> SavingsGoal:
        goal = self.get_by_id(goal_id, user_id)
        update_data = goal_in.model_dump(exclude_unset=True)

        if "deadline" in update_data and update_data["deadline"] < date.today():
            raise ValidationError("Deadline cannot be in the past")

        for field, value in update_data.items():
            setattr(goal, field, value)

        # Re-check completion status if amounts changed
        target = Decimal(str(goal.target_amount))
        saved = Decimal(str(goal.saved_amount))
        if saved >= target:
            goal.saved_amount = target
            goal.status = "complete"
        else:
            goal.status = "active"

        return self.goal_repo.update(goal)

    def contribute(self, user_id: int, goal_id: int, amount: Decimal) -> SavingsGoal:
        goal = self.get_by_id(goal_id, user_id)
        if goal.status == "complete":
            raise ValidationError("Savings goal is already completed")

        target = Decimal(str(goal.target_amount))
        current_saved = Decimal(str(goal.saved_amount))
        new_saved = current_saved + amount

        if new_saved >= target:
            goal.saved_amount = target
            goal.status = "complete"
            
            # Create completed notification
            notif = Notification(
                user_id=user_id,
                type="goal_complete",
                title="Savings Goal Reached!",
                message=f"Congratulations! You've successfully reached your target of {goal.target_amount:,.2f} for '{goal.title}'."
            )
            self.notif_repo.create(notif)
        else:
            goal.saved_amount = new_saved

        return self.goal_repo.update(goal)

    def delete(self, user_id: int, goal_id: int) -> None:
        goal = self.get_by_id(goal_id, user_id)
        self.goal_repo.delete(goal)
