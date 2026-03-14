"""Onboarding status endpoint — checks if user has completed minimum setup."""

from fastapi import APIRouter, Depends
from ..dependencies import get_current_user, get_db

router = APIRouter()


@router.get("/status")
def onboarding_status(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Returns boolean flags indicating whether the user has completed
    each onboarding step:
      - has_income: at least 1 income source
      - has_subscriptions: at least 1 subscription
      - has_expenses: at least 3 expenses
      - is_complete: all three conditions met
    """
    user_id = user.user.id

    income_count = len((db.table("income").select("id").eq("user_id", user_id).execute()).data or [])
    subs_count = len((db.table("subscriptions").select("id").eq("user_id", user_id).execute()).data or [])
    expenses_count = len((db.table("expenses").select("id").eq("user_id", user_id).execute()).data or [])

    has_income = income_count >= 1
    has_subscriptions = subs_count >= 1
    has_expenses = expenses_count >= 3

    return {
        "has_income": has_income,
        "has_subscriptions": has_subscriptions,
        "has_expenses": has_expenses,
        "is_complete": has_income and has_subscriptions and has_expenses,
        "counts": {
            "income": income_count,
            "subscriptions": subs_count,
            "expenses": expenses_count,
        },
    }
