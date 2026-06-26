from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, notification_id: int) -> Optional[Notification]:
        return self.db.query(Notification).filter(Notification.id == notification_id).first()

    def get_all_by_user(self, user_id: int, limit: int = 50) -> List[Notification]:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).limit(limit).all()

    def get_unread_count_by_user(self, user_id: int) -> int:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def update(self, notification: Notification) -> Notification:
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_read_by_user(self, user_id: int) -> None:
        self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({Notification.is_read: True}, synchronize_session=False)
        self.db.commit()

    def delete(self, notification: Notification) -> None:
        self.db.delete(notification)
        self.db.commit()

    def has_notification_this_month(self, user_id: int, type: str, message_substring: str) -> bool:
        today = date.today()
        start_of_month = datetime(today.year, today.month, 1)
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type == type,
            Notification.created_at >= start_of_month,
            Notification.message.like(f"%{message_substring}%")
        ).first() is not None
