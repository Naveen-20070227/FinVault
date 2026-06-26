from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationUnreadCount
from app.services.notification_service import NotificationService

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif_service = NotificationService(db)
    return notif_service.get_all(current_user.id)

@router.get("/unread-count", response_model=NotificationUnreadCount)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif_service = NotificationService(db)
    count = notif_service.get_unread_count(current_user.id)
    return NotificationUnreadCount(unread_count=count)

@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif_service = NotificationService(db)
    return notif_service.mark_as_read(current_user.id, id)

@router.patch("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif_service = NotificationService(db)
    notif_service.mark_all_read(current_user.id)
    return {"message": "All notifications marked as read"}

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif_service = NotificationService(db)
    notif_service.delete(current_user.id, id)
    return None
