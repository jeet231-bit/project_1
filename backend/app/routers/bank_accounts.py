from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from ..models import BankAccount
from typing import List
from ..dependencies import get_db, get_current_user

router = APIRouter()


@router.post("", response_model=BankAccount)
def create_bank_account(account: BankAccount, user=Depends(get_current_user), db=Depends(get_db)):
    try:
        data = jsonable_encoder(account, exclude_none=True)
        data.pop('id', None)
        data['user_id'] = user.user.id
        response = db.table("bank_accounts").insert(data).execute()
        if response.data:
            return response.data[0]
    except Exception as e:
        print(f"Error inserting bank account: {e}")
        return account
    return account


@router.get("", response_model=List[BankAccount])
def get_bank_accounts(user=Depends(get_current_user), db=Depends(get_db)):
    try:
        response = db.table("bank_accounts").select("*").eq("user_id", user.user.id).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching bank accounts: {e}")
        return []


@router.put("/{account_id}", response_model=BankAccount)
def update_bank_account(account_id: int, updated: BankAccount, user=Depends(get_current_user), db=Depends(get_db)):
    try:
        data = jsonable_encoder(updated, exclude_unset=True)
        data.pop('id', None)
        response = db.table("bank_accounts").update(data).eq("id", account_id).eq("user_id", user.user.id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Bank account not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{account_id}")
def delete_bank_account(account_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    try:
        db.table("bank_accounts").delete().eq("id", account_id).eq("user_id", user.user.id).execute()
        return {"message": "Bank account deleted"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
