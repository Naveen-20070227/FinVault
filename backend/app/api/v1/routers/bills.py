from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.bill import BillResponse, BillCreate, BillUpdate
from app.services.bill_service import BillService

router = APIRouter()

@router.get("/", response_model=List[BillResponse])
def list_bills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bill_service = BillService(db)
    return bill_service.get_all(current_user.id)

@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill_in: BillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bill_service = BillService(db)
    return bill_service.create(current_user.id, bill_in)

@router.put("/{id}", response_model=BillResponse)
def update_bill(
    id: int,
    bill_in: BillUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bill_service = BillService(db)
    return bill_service.update(current_user.id, id, bill_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bill_service = BillService(db)
    bill_service.delete(current_user.id, id)
    return None

@router.post("/{id}/pay", response_model=BillResponse)
def pay_bill(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bill_service = BillService(db)
    return bill_service.pay_bill(current_user.id, id)

@router.post("/{id}/unpay", response_model=BillResponse)
def unpay_bill(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bill_service = BillService(db)
    return bill_service.unpay_bill(current_user.id, id)
