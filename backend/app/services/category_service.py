from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundError, ValidationError, ConflictError
from app.models.category import Category
from app.repositories.category_repo import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate

class CategoryService:
    def __init__(self, db: Session):
        self.db = db
        self.category_repo = CategoryRepository(db)

    def get_by_id(self, category_id: int, user_id: int) -> Category:
        category = self.category_repo.get_by_id(category_id)
        if not category or category.user_id != user_id:
            raise NotFoundError("Category not found")
        return category

    def get_all(self, user_id: int, cat_type: Optional[str] = None) -> List[Category]:
        return self.category_repo.get_all_by_user(user_id, cat_type)

    def create(self, user_id: int, category_in: CategoryCreate) -> Category:
        # Check duplicate name/type for user
        existing = self.category_repo.get_by_name_and_type(user_id, category_in.name, category_in.type)
        if existing:
            raise ConflictError(f"Category '{category_in.name}' of type '{category_in.type}' already exists")

        db_category = Category(
            user_id=user_id,
            name=category_in.name,
            type=category_in.type,
            icon=category_in.icon,
            color=category_in.color
        )
        return self.category_repo.create(db_category)

    def update(self, user_id: int, category_id: int, category_in: CategoryUpdate) -> Category:
        category = self.get_by_id(category_id, user_id)
        update_data = category_in.model_dump(exclude_unset=True)

        if "name" in update_data or "type" in update_data:
            name = update_data.get("name", category.name)
            cat_type = update_data.get("type", category.type)
            # Check duplicate conflict if renaming
            if name != category.name or cat_type != category.type:
                existing = self.category_repo.get_by_name_and_type(user_id, name, cat_type)
                if existing:
                    raise ConflictError(f"Category '{name}' of type '{cat_type}' already exists")

        for field, value in update_data.items():
            setattr(category, field, value)

        return self.category_repo.update(category)

    def delete(self, user_id: int, category_id: int) -> None:
        category = self.get_by_id(category_id, user_id)

        # Deleting a category with transactions/budgets -> 400 error (protected)
        if self.category_repo.has_transactions(category_id):
            raise ValidationError("Cannot delete category because it has transaction history.")
            
        if self.category_repo.has_budgets(category_id):
            raise ValidationError("Cannot delete category because it is linked to active budgets.")

        self.category_repo.delete(category)
