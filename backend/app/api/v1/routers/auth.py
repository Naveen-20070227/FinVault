from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, Token, UserResponse
from app.core.dependencies import get_current_user
from app.middlewares.rate_limit import rate_limit_dependency
from app.models.user import User
from pydantic import BaseModel, Field

router = APIRouter()

class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email address")
    password: str = Field(..., description="User password")

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_dependency)])
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    return auth_service.register(user_in)

@router.post("/login", response_model=Token, dependencies=[Depends(rate_limit_dependency)])
def login(login_req: LoginRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    return auth_service.login(login_req.username, login_req.password)

@router.post("/refresh", response_model=Token)
def refresh(refresh_req: RefreshRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    return auth_service.refresh_token(refresh_req.refresh_token)

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # JWT is stateless, so client-side token clearing is sufficient.
    # In future, a blocklist or redis could be implemented here.
    return {"message": "Successfully logged out"}
