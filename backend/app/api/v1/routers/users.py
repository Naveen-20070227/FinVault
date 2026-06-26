import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import ValidationError
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, UserPasswordChange
from app.services.user_service import UserService

router = APIRouter()

def validate_image_magic_bytes(content: bytes) -> bool:
    # PNG: \x89PNG\r\n\x1a\n
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    # JPEG: \xff\xd8\xff
    if content.startswith(b"\xff\xd8\xff"):
        return True
    return False

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_service = UserService(db)
    return user_service.update_profile(current_user, user_in)

@router.patch("/me/password")
def change_password(
    password_in: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_service = UserService(db)
    user_service.change_password(current_user, password_in.current_password, password_in.new_password)
    return {"message": "Password changed successfully"}

@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Read content
    content = await file.read()
    
    # 1. Size Validation (5MB)
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise ValidationError("File size exceeds the 5MB limit")

    # 2. Format Validation
    if not validate_image_magic_bytes(content):
        raise ValidationError("Invalid image type. Only JPG and PNG are allowed.")

    # Create upload directory if not exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Save file
    file_ext = os.path.splitext(file.filename)[1].lower()
    if not file_ext or file_ext not in [".png", ".jpg", ".jpeg"]:
        file_ext = ".jpg"  # Fallback
        
    unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex}{file_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    with open(filepath, "wb") as f:
        f.write(content)

    user_service = UserService(db)
    return user_service.update_avatar(current_user, unique_filename)
