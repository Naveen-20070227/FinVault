from datetime import timedelta
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core import security
from app.models.user import User
from app.models.category import Category
from app.repositories.user_repo import UserRepository
from app.repositories.category_repo import CategoryRepository
from app.schemas.user import UserCreate, Token

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.category_repo = CategoryRepository(db)

    def register(self, user_in: UserCreate) -> User:
        # Check duplicate username
        if self.user_repo.get_by_username(user_in.username):
            raise ConflictError("Username is already registered")

        # Check duplicate email
        if self.user_repo.get_by_email(user_in.email):
            raise ConflictError("Email is already registered")

        # Create user
        hashed_password = security.get_password_hash(user_in.password)
        db_user = User(
            username=user_in.username,
            email=user_in.email,
            password_hash=hashed_password
        )
        user = self.user_repo.create(db_user)

        # Seed default categories
        self._seed_default_categories(user.id)

        return user

    def login(self, username_or_email: str, password: str) -> Token:
        # Resolve user by username or email
        user = self.user_repo.get_by_username(username_or_email)
        if not user:
            user = self.user_repo.get_by_email(username_or_email)

        if not user or not security.verify_password(password, user.password_hash):
            raise UnauthorizedError("Incorrect username/email or password")

        if not user.is_active:
            raise UnauthorizedError("User is inactive")

        # Generate tokens
        access_token = security.create_access_token(subject=user.username)
        refresh_token = security.create_refresh_token(subject=user.username)

        return Token(access_token=access_token, refresh_token=refresh_token)

    def refresh_token(self, refresh_token: str) -> Token:
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: str = payload.get("sub")
            token_type: str = payload.get("type")
            
            if username is None or token_type != "refresh":
                raise UnauthorizedError("Invalid refresh token")
        except JWTError:
            raise UnauthorizedError("Could not validate refresh token")

        user = self.user_repo.get_by_username(username)
        if not user or not user.is_active:
            raise UnauthorizedError("User not found or inactive")

        # Generate new access token and keep refresh token
        new_access_token = security.create_access_token(subject=user.username)
        new_refresh_token = security.create_refresh_token(subject=user.username)

        return Token(access_token=new_access_token, refresh_token=new_refresh_token)

    def _seed_default_categories(self, user_id: int) -> None:
        defaults = [
            # Income categories
            {"name": "Salary", "type": "income", "icon": "ti-wallet", "color": "#10B981"},
            {"name": "Freelance", "type": "income", "icon": "ti-briefcase", "color": "#3B82F6"},
            {"name": "Investments", "type": "income", "icon": "ti-trending-up", "color": "#8B5CF6"},
            
            # Expense categories
            {"name": "Food & Dining", "type": "expense", "icon": "ti-shopping-cart", "color": "#EF4444"},
            {"name": "Rent & Housing", "type": "expense", "icon": "ti-home", "color": "#F59E0B"},
            {"name": "Utilities", "type": "expense", "icon": "ti-bolt", "color": "#EC4899"},
            {"name": "Entertainment", "type": "expense", "icon": "ti-game-controller", "color": "#6366F1"},
            {"name": "Transportation", "type": "expense", "icon": "ti-car", "color": "#14B8A6"},
            {"name": "Others", "type": "expense", "icon": "ti-tag", "color": "#6B7280"}
        ]
        
        for item in defaults:
            category = Category(
                user_id=user_id,
                name=item["name"],
                type=item["type"],
                icon=item["icon"],
                color=item["color"]
            )
            self.category_repo.create(category)
