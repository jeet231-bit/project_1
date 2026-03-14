from fastapi import APIRouter, Depends
from typing import List, Dict
from datetime import date, timedelta
from ..models import Subscription
from ..dependencies import get_db, get_current_user

router = APIRouter()

@router.get("/monthly-spend")
def get_monthly_spend(user = Depends(get_current_user), db = Depends(get_db)):
    # Calculate locally for now after fetching all expenses
    # Ideally use SQL aggregation
    try:
        expenses = db.table("expenses").select("*").eq("user_id", user.user.id).execute().data
        total = sum(e['amount'] for e in expenses if date.fromisoformat(str(e['date'])).month == date.today().month)
        return {"monthly_spend": total}
    except:
        return {"monthly_spend": 0.0}

@router.get("/yearly-spend")
def get_yearly_spend(user = Depends(get_current_user), db = Depends(get_db)):
    try:
        expenses = db.table("expenses").select("*").eq("user_id", user.user.id).execute().data
        total = sum(e['amount'] for e in expenses if date.fromisoformat(str(e['date'])).year == date.today().year)
        return {"yearly_spend": total}
    except:
        return {"yearly_spend": 0.0}

@router.get("/active-subscriptions-count")
def get_active_subscriptions_count(user = Depends(get_current_user), db = Depends(get_db)):
    try:
        # response = db.table("subscriptions").select("count", count="exact").eq("status", "active").eq("user_id", user.user.id).execute()
        # count = response.count
        subs = db.table("subscriptions").select("*").eq("user_id", user.user.id).eq("status", "active").execute().data
        return {"active_subscriptions_count": len(subs)}
    except:
        return {"active_subscriptions_count": 0}

@router.get("/category-wise-aggregation")
def get_category_wise_aggregation(user = Depends(get_current_user), db = Depends(get_db)) -> Dict[str, float]:
    try:
        expenses = db.table("expenses").select("*").eq("user_id", user.user.id).execute().data
        aggregation = {}
        for expense in expenses:
            cat = expense['category']
            aggregation[cat] = aggregation.get(cat, 0) + expense['amount']
        return aggregation
    except:
        return {}

@router.get("/upcoming-renewals")
def get_upcoming_renewals(user = Depends(get_current_user), db = Depends(get_db)): # -> List[Subscription]:
    try:
        today = date.today()
        next_week = today + timedelta(days=7)
        # Simple fetch and filter
        subs = db.table("subscriptions").select("*").eq("user_id", user.user.id).execute().data
        # Note: Models expect objects, here we just return list of dicts or need to parse
        return [s for s in subs if str(today) <= str(s['next_renewal_date']) <= str(next_week)]
    except:
        return []
