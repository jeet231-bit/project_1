from fastapi import APIRouter, HTTPException
from ..models import Subscription
from typing import List
from datetime import date

router = APIRouter()

# Mock database
db: List[Subscription] = [
    Subscription(id=1, name="Netflix", category="Entertainment", amount=15.99, billing_cycle="monthly", next_renewal_date=date(2024, 8, 1), auto_pay=True, status="active"),
    Subscription(id=2, name="Spotify", category="Music", amount=9.99, billing_cycle="monthly", next_renewal_date=date(2024, 7, 15), auto_pay=True, status="active"),
]

@router.post("/", response_model=Subscription)
def create_subscription(subscription: Subscription):
    subscription.id = max(s.id for s in db) + 1 if db else 1
    db.append(subscription)
    return subscription

@router.get("/", response_model=List[Subscription])
def get_subscriptions():
    return db

@router.get("/{subscription_id}", response_model=Subscription)
def get_subscription(subscription_id: int):
    subscription = next((s for s in db if s.id == subscription_id), None)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription

@router.put("/{subscription_id}", response_model=Subscription)
def update_subscription(subscription_id: int, updated_subscription: Subscription):
    subscription = next((s for s in db if s.id == subscription_id), None)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    for key, value in updated_subscription.dict().items():
        setattr(subscription, key, value)
    return subscription

@router.delete("/{subscription_id}")
def delete_subscription(subscription_id: int):
    subscription = next((s for s in db if s.id == subscription_id), None)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    db.remove(subscription)
    return {"message": "Subscription deleted"}

@router.post("/{subscription_id}/cancel", response_model=Subscription)
def cancel_subscription(subscription_id: int):
    subscription = next((s for s in db if s.id == subscription_id), None)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    subscription.status = "cancelled"
    return subscription

@router.post("/{subscription_id}/renew", response_model=Subscription)
def renew_subscription(subscription_id: int):
    subscription = next((s for s in db if s.id == subscription_id), None)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    subscription.status = "active"
    return subscription
