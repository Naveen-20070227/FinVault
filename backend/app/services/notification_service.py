from typing import List
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundError
from app.models.notification import Notification
from app.repositories.notification_repo import NotificationRepository

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.notif_repo = NotificationRepository(db)

    def get_all(self, user_id: int, limit: int = 50) -> List[Notification]:
        return self.notif_repo.get_all_by_user(user_id, limit)

    def get_unread_count(self, user_id: int) -> int:
        return self.notif_repo.get_unread_count_by_user(user_id)

    def mark_as_read(self, user_id: int, notification_id: int) -> Notification:
        notif = self.notif_repo.get_by_id(notification_id)
        if not notif or notif.user_id != user_id:
            raise NotFoundError("Notification not found")
        notif.is_read = True
        return self.notif_repo.update(notif)

    def mark_all_read(self, user_id: int) -> None:
        self.notif_repo.mark_all_read_by_user(user_id)

    def delete(self, user_id: int, notification_id: int) -> None:
        notif = self.notif_repo.get_by_id(notification_id)
        if not notif or notif.user_id != user_id:
            raise NotFoundError("Notification not found")
        self.notif_repo.delete(notif)
