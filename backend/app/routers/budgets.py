"""
Category Budgets Router
=======================

CRUD endpoints for managing per-category monthly budget limits.
Backed by the category_budgets table (user_id, category, monthly_limit)
with a UNIQUE(user_id, category) constraint enabling upsert semantics.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Any
from ..dependencies import get_db, get_current_user

router = APIRouter()


@router.get("/")
def list_budgets(user=Depends(get_current_user), db=Depends(get_db)):
    """List all category budgets for the authenticated user."""
    result = (
        db.table("category_budgets")
        .select("*")
        .eq("user_id", user.user.id)
        .order("category", desc=False)
        .execute()
    )
    return result.data or []


@router.post("/")
def upsert_budget(
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create or update a category budget (upsert on user_id + category)."""
    category = (payload.get("category") or "").strip()
    monthly_limit = payload.get("monthly_limit")

    if not category:
        raise HTTPException(status_code=400, detail="Category is required")
    if monthly_limit is None or float(monthly_limit) <= 0:
        raise HTTPException(status_code=400, detail="monthly_limit must be positive")

    data = {
        "user_id": user.user.id,
        "category": category,
        "monthly_limit": float(monthly_limit),
    }
    result = (
        db.table("category_budgets")
        .upsert(data, on_conflict="user_id,category")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to upsert budget")
    return result.data[0]


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a category budget by id."""
    result = (
        db.table("category_budgets")
        .delete()
        .eq("id", budget_id)
        .eq("user_id", user.user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"status": "deleted", "id": budget_id}
