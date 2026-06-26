import os
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.core import security
from app.core.exceptions import NotFoundError, UnauthorizedError, ValidationError
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserUpdate

class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def get_profile(self, user_id: int) -> User:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        return user

    def update_profile(self, user: User, user_in: UserUpdate) -> User:
        update_data = user_in.model_dump(exclude_unset=True)
        
        # Check if username or email is being changed and is already taken
        if "username" in update_data and update_data["username"] != user.username:
            if self.user_repo.get_by_username(update_data["username"]):
                raise ValidationError("Username is already taken")
                
        if "email" in update_data and update_data["email"] != user.email:
            if self.user_repo.get_by_email(update_data["email"]):
                raise ValidationError("Email is already taken")

        for field, value in update_data.items():
            setattr(user, field, value)
            
        return self.user_repo.update(user)

    def change_password(self, user: User, current_password: str, new_password: str) -> User:
        if not security.verify_password(current_password, user.password_hash):
            raise UnauthorizedError("Incorrect current password")
            
        user.password_hash = security.get_password_hash(new_password)
        return self.user_repo.update(user)

    def update_avatar(self, user: User, avatar_filename: str) -> User:
        # Delete old avatar file if exists
        if user.profile_image:
            old_path = os.path.join(settings.UPLOAD_DIR, user.profile_image)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass  # Silently ignore if file deletion fails
                    
        user.profile_image = avatar_filename
        return self.user_repo.update(user)
