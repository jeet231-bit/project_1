"""
Fixed Commitments Router
========================

CRUD endpoints for managing a user's fixed monthly obligations
(rent, EMI, insurance, utilities, etc.).

These predictable commitments are separated from variable expenses
to enable more accurate surplus and trajectory calculations.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Any
from ..dependencies import get_db, get_current_user

router = APIRouter()


@router.post("/")
def create_commitment(
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Add a new fixed commitment."""
    data = {
        "user_id": user.user.id,
        "name": payload.get("name", ""),
        "category": payload.get("category", "General"),
        "amount": payload.get("amount", 0),
        "frequency": payload.get("frequency", "monthly"),
        "is_active": payload.get("is_active", True),
    }
    if not data["name"]:
        raise HTTPException(status_code=400, detail="Commitment name is required")
    if data["amount"] <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    result = db.table("fixed_commitments").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create commitment")
    return result.data[0]


@router.get("/")
def list_commitments(user=Depends(get_current_user), db=Depends(get_db)):
    """List all fixed commitments for the user."""
    result = (
        db.table("fixed_commitments")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


@router.get("/{commitment_id}")
def get_commitment(
    commitment_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a single fixed commitment."""
    result = (
        db.table("fixed_commitments")
        .select("*")
        .eq("id", commitment_id)
        .eq("user_id", user.user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Commitment not found")
    return result.data[0]


@router.put("/{commitment_id}")
def update_commitment(
    commitment_id: int,
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update a fixed commitment."""
    update_data = {}
    for key in ("name", "category", "amount", "frequency", "is_active"):
        if key in payload:
            update_data[key] = payload[key]
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        db.table("fixed_commitments")
        .update(update_data)
        .eq("id", commitment_id)
        .eq("user_id", user.user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Commitment not found")
    return result.data[0]


@router.delete("/{commitment_id}")
def delete_commitment(
    commitment_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a fixed commitment."""
    db.table("fixed_commitments").delete().eq("id", commitment_id).eq(
        "user_id", user.user.id
    ).execute()
    return {"message": "Commitment deleted"}
