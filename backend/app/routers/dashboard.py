from fastapi import APIRouter
from typing import List, Dict
from datetime import date, timedelta
from ..models import Subscription
from .subscriptions import db as subscriptions_db
from .expenses import db as expenses_db

router = APIRouter()

@router.get("/monthly-spend")
def get_monthly_spend():
    total = sum(e.amount for e in expenses_db if e.date.month == date.today().month)
    return {"monthly_spend": total}

@router.get("/yearly-spend")
def get_yearly_spend():
    total = sum(e.amount for e in expenses_db if e.date.year == date.today().year)
    return {"yearly_spend": total}

@router.get("/active-subscriptions-count")
def get_active_subscriptions_count():
    count = sum(1 for s in subscriptions_db if s.status == "active")
    return {"active_subscriptions_count": count}

@router.get("/category-wise-aggregation")
def get_category_wise_aggregation() -> Dict[str, float]:
    aggregation = {}
    for expense in expenses_db:
        aggregation[expense.category] = aggregation.get(expense.category, 0) + expense.amount
    return aggregation

@router.get("/upcoming-renewals")
def get_upcoming_renewals() -> List[Subscription]:
    today = date.today()
    next_week = today + timedelta(days=7)
    return [s for s in subscriptions_db if today <= s.next_renewal_date <= next_week]
