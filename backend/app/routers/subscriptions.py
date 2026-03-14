from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from ..models import Subscription
from typing import List
from ..dependencies import get_db, get_current_user

router = APIRouter()

@router.post("", response_model=Subscription)
def create_subscription(subscription: Subscription, user = Depends(get_current_user), db = Depends(get_db)):
    # In a real app, you'd associate the subscription with the user.user.id
    # db.table("subscriptions").insert(subscription.dict())
    
    # For now, just simulating the DB interaction as the table might not exist
    # and we want to ensure basic connectivity first.
    
    # Try to insert if table exists (assuming 'subscriptions' table)
    try:
        data = jsonable_encoder(subscription, exclude_none=True)
        data.pop('id', None)  # Let DB auto-generate
        data['user_id'] = user.user.id
        response = db.table("subscriptions").insert(data).execute()
        if response.data:
            return response.data[0]
    except Exception as e:
        print(f"Error inserting: {e}")
        # Fallback for now if table missing
        return subscription
        
    return subscription

@router.get("", response_model=List[Subscription])
def get_subscriptions(user = Depends(get_current_user), db = Depends(get_db)):
    try:
        response = db.table("subscriptions").select("*").eq("user_id", user.user.id).execute()
        return response.data
    except Exception as e:
         print(f"Error fetching: {e}")
         return []

@router.get("/{subscription_id}", response_model=Subscription)
def get_subscription(subscription_id: int, user = Depends(get_current_user), db = Depends(get_db)):
    try:
        response = db.table("subscriptions").select("*").eq("id", subscription_id).eq("user_id", user.user.id).execute()
        if not response.data:
             raise HTTPException(status_code=404, detail="Subscription not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{subscription_id}", response_model=Subscription)
def update_subscription(subscription_id: int, updated_subscription: Subscription, user = Depends(get_current_user), db = Depends(get_db)):
    try:
        data = jsonable_encoder(updated_subscription, exclude_unset=True)
        data.pop('id', None)
        response = db.table("subscriptions").update(data).eq("id", subscription_id).eq("user_id", user.user.id).execute()
        if not response.data:
             raise HTTPException(status_code=404, detail="Subscription not found")
        return response.data[0]
    except Exception as e:
         raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{subscription_id}")
def delete_subscription(subscription_id: int, user = Depends(get_current_user), db = Depends(get_db)):
    try:
        response = db.table("subscriptions").delete().eq("id", subscription_id).eq("user_id", user.user.id).execute()
        # Create a clearer response if needed, but Supabase delete returns data
        return {"message": "Subscription deleted"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
