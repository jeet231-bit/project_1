from fastapi import APIRouter, HTTPException
from ..models import Expense
from typing import List
from datetime import date

router = APIRouter()

# Mock database
db: List[Expense] = [
    Expense(id=1, name="Groceries", amount=75.50, category="Food", date=date(2024, 7, 10), payment_method="Credit Card"),
    Expense(id=2, name="Gas", amount=40.00, category="Transportation", date=date(2024, 7, 12), payment_method="Debit Card"),
]

@router.post("/", response_model=Expense)
def create_expense(expense: Expense):
    expense.id = max(e.id for e in db) + 1 if db else 1
    db.append(expense)
    return expense

@router.get("/", response_model=List[Expense])
def get_expenses():
    return db

@router.get("/{expense_id}", response_model=Expense)
def get_expense(expense_id: int):
    expense = next((e for e in db if e.id == expense_id), None)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.put("/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, updated_expense: Expense):
    expense = next((e for e in db if e.id == expense_id), None)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    for key, value in updated_expense.dict().items():
        setattr(expense, key, value)
    return expense

@router.delete("/{expense_id}")
def delete_expense(expense_id: int):
    expense = next((e for e in db if e.id == expense_id), None)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.remove(expense)
    return {"message": "Expense deleted"}
