from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.database.session import get_db
from app.repositories.user_repo import UserRepository
from app.models.user import User
from app.core.exceptions import UnauthorizedError
from app.schemas.user import TokenData

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    if not token:
        raise UnauthorizedError("Missing authentication token")
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None or token_type != "access":
            raise UnauthorizedError("Invalid or expired access token")
            
        token_data = TokenData(username=username, token_type=token_type)
    except JWTError:
        raise UnauthorizedError("Could not validate credentials")
        
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(token_data.username)
    if user is None:
        raise UnauthorizedError("User not found")
        
    if not user.is_active:
        raise UnauthorizedError("Inactive user account")
        
    return user
