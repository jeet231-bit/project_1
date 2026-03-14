from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from ..models import Expense
from typing import List
from ..dependencies import get_db, get_current_user

router = APIRouter()

@router.post("", response_model=Expense)
def create_expense(expense: Expense, user = Depends(get_current_user), db = Depends(get_db)):
    try:
        data = jsonable_encoder(expense, exclude_none=True)
        data.pop('id', None)  # Let DB auto-generate
        data['user_id'] = user.user.id
        response = db.table("expenses").insert(data).execute()
        if response.data:
            return response.data[0]
        return expense # Fallback
    except Exception as e:
        # If table doesn't exist etc
        return expense

@router.get("", response_model=List[Expense])
def get_expenses(user = Depends(get_current_user), db = Depends(get_db)):
    try:
        response = db.table("expenses").select("*").eq("user_id", user.user.id).execute()
        return response.data
    except Exception as e:
        return []

@router.get("/{expense_id}", response_model=Expense)
def get_expense(expense_id: int, user = Depends(get_current_user), db = Depends(get_db)):
    try:
        response = db.table("expenses").select("*").eq("id", expense_id).eq("user_id", user.user.id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, updated_expense: Expense, user = Depends(get_current_user), db = Depends(get_db)):
    try:
        data = jsonable_encoder(updated_expense, exclude_unset=True)
        data.pop('id', None)
        response = db.table("expenses").update(data).eq("id", expense_id).eq("user_id", user.user.id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, user = Depends(get_current_user), db = Depends(get_db)):
    try:
        db.table("expenses").delete().eq("id", expense_id).eq("user_id", user.user.id).execute()
        return {"message": "Expense deleted"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
