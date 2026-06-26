from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.category import CategoryResponse, CategoryCreate, CategoryUpdate
from app.services.category_service import CategoryService

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
def list_categories(
    type: Optional[str] = Query(None, regex="^(income|expense)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat_service = CategoryService(db)
    return cat_service.get_all(current_user.id, type)

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat_service = CategoryService(db)
    return cat_service.create(current_user.id, category_in)

@router.put("/{id}", response_model=CategoryResponse)
def update_category(
    id: int,
    category_in: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat_service = CategoryService(db)
    return cat_service.update(current_user.id, id, category_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat_service = CategoryService(db)
    cat_service.delete(current_user.id, id)
    return None
