import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import ValidationError
from app.models.user import User
from app.schemas.transaction import TransactionResponse, TransactionCreate, TransactionUpdate
from app.services.transaction_service import TransactionService

router = APIRouter()

def validate_receipt_magic_bytes(content: bytes) -> bool:
    # PNG: \x89PNG\r\n\x1a\n
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    # JPEG: \xff\xd8\xff
    if content.startswith(b"\xff\xd8\xff"):
        return True
    # PDF: %PDF
    if content.startswith(b"%PDF"):
        return True
    return False

@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None, regex="^(income|expense)$"),
    category_id: Optional[int] = Query(None),
    month: Optional[str] = Query(None, regex="^\d{4}-\d{2}$"),  # YYYY-MM
    sort: str = Query("date_desc"),  # format: field_order e.g. date_desc, amount_asc
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_service = TransactionService(db)
    
    # Parse sort parameter
    sort_by = "date"
    sort_order = "desc"
    if "_" in sort:
        parts = sort.split("_")
        sort_by = parts[0]
        sort_order = parts[1]

    skip = (page - 1) * limit
    txs, _ = tx_service.get_all(
        user_id=current_user.id,
        search=search,
        tx_type=type,
        category_id=category_id,
        month=month,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=limit
    )
    return txs

@router.get("/count")
def get_transactions_count(
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None, regex="^(income|expense)$"),
    category_id: Optional[int] = Query(None),
    month: Optional[str] = Query(None, regex="^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_service = TransactionService(db)
    _, total = tx_service.get_all(
        user_id=current_user.id,
        search=search,
        tx_type=type,
        category_id=category_id,
        month=month,
        limit=1
    )
    return {"count": total}

@router.get("/{id}", response_model=TransactionResponse)
def get_transaction(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_service = TransactionService(db)
    return tx_service.get_by_id(id, current_user.id)

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_service = TransactionService(db)
    return tx_service.create(current_user.id, tx_in)

@router.put("/{id}", response_model=TransactionResponse)
def update_transaction(
    id: int,
    tx_in: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_service = TransactionService(db)
    return tx_service.update(current_user.id, id, tx_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_service = TransactionService(db)
    tx_service.delete(current_user.id, id)
    return None

@router.post("/upload-receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    
    # 1. Size Validation (5MB)
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise ValidationError("Receipt file size exceeds 5MB limit")
        
    # 2. Magic byte validation
    if not validate_receipt_magic_bytes(content):
        raise ValidationError("Invalid receipt file type. Only JPG, PNG, and PDF are allowed.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if not file_ext:
        file_ext = ".jpg" # Default fallback
        
    unique_filename = f"receipt_{current_user.id}_{uuid.uuid4().hex}{file_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    with open(filepath, "wb") as f:
        f.write(content)
        
    return {"filename": unique_filename}
