"""
Capital Discipline Router
=========================

Endpoints for the Capital Discipline Engine layer:
- Income management (CRUD)
- Allocation preferences (get/set)
- Surplus & burn rate report
- Capital trajectory forecast
- Discipline score
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Any, List
from ..dependencies import get_db, get_current_user
from ..surplus_engine import calculate_monthly_surplus
from ..capital_allocation_engine import get_allocation_recommendation
from ..trajectory_engine import forecast_capital_trajectory, compute_discipline_score
from ..behavior_engine import compute_behavior_metrics, compute_advanced_behavior_signals

router = APIRouter()


# ─── Helper: load raw data for engines ──────────────────────────────────────

def _load_user_data(user_id: str, db):
    """Fetch income, commitments, subscriptions, expenses from Supabase for the user."""

    class Obj:
        def __init__(self, d):
            self.__dict__ = d

    income_resp = db.table("income").select("*").eq("user_id", user_id).execute()
    income_rows = [Obj({
        "source": r.get("source", ""),
        "amount": r.get("amount", 0),
        "frequency": r.get("frequency", "monthly"),
        "is_active": r.get("is_active", True),
    }) for r in (income_resp.data or [])]

    commit_resp = db.table("fixed_commitments").select("*").eq("user_id", user_id).execute()
    commitments = [Obj({
        "name": c.get("name", ""),
        "category": c.get("category", "General"),
        "amount": c.get("amount", 0),
        "frequency": c.get("frequency", "monthly"),
        "is_active": c.get("is_active", True),
    }) for c in (commit_resp.data or [])]

    subs_resp = db.table("subscriptions").select("*").eq("user_id", user_id).execute()
    subs = [Obj({
        "name": s.get("name"), "amount": s.get("amount", 0),
        "billing_cycle": s.get("billing_cycle", "monthly").lower(),
        "category": s.get("category", "General"),
        "status": s.get("status", "active"),
        "created_at": s.get("created_at"),
    }) for s in (subs_resp.data or [])]

    exp_resp = db.table("expenses").select("*").eq("user_id", user_id).execute()
    expenses = [Obj({
        "name": e.get("name"), "amount": e.get("amount", 0),
        "category": e.get("category", "General"),
        "date": e.get("date"),
    }) for e in (exp_resp.data or [])]

    return income_rows, commitments, subs, expenses


def _load_allocation_prefs(user_id: str, db) -> Dict[str, Any]:
    """Fetch or default allocation preferences."""
    try:
        result = db.table("capital_allocation_preferences").select("*").eq("user_id", user_id).execute()
        if result.data:
            return result.data[0]
    except Exception:
        pass
    # Return defaults
    return {
        "savings_pct": 50, "investment_pct": 30,
        "debt_repayment_pct": 10, "lifestyle_pct": 10,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Income CRUD
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/income")
def add_income(payload: Dict[str, Any] = Body(...), user=Depends(get_current_user), db=Depends(get_db)):
    """Add a new income source."""
    user_id = user.user.id
    data = {
        "user_id": user_id,
        "source": payload.get("source", "Salary"),
        "amount": payload.get("amount", 0),
        "frequency": payload.get("frequency", "monthly"),
        "is_active": payload.get("is_active", True),
    }
    result = db.table("income").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to add income")
    return result.data[0]


@router.get("/income")
def list_income(user=Depends(get_current_user), db=Depends(get_db)):
    """List all income sources for the user."""
    result = db.table("income").select("*").eq("user_id", user.user.id).execute()
    return result.data or []


@router.put("/income/{income_id}")
def update_income(income_id: int, payload: Dict[str, Any] = Body(...), user=Depends(get_current_user), db=Depends(get_db)):
    """Update an income source."""
    update_data = {}
    for key in ("source", "amount", "frequency", "is_active"):
        if key in payload:
            update_data[key] = payload[key]
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.table("income").update(update_data).eq("id", income_id).eq("user_id", user.user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Income source not found")
    return result.data[0]


@router.delete("/income/{income_id}")
def delete_income(income_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    """Delete an income source."""
    db.table("income").delete().eq("id", income_id).eq("user_id", user.user.id).execute()
    return {"message": "Income source deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# Allocation Preferences
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/allocation")
def get_allocation_preferences(user=Depends(get_current_user), db=Depends(get_db)):
    """Get the user's capital allocation preferences (or defaults)."""
    prefs = _load_allocation_prefs(user.user.id, db)
    return prefs


@router.put("/allocation")
def set_allocation_preferences(payload: Dict[str, Any] = Body(...), user=Depends(get_current_user), db=Depends(get_db)):
    """
    Create or update allocation preferences.
    Body: { savings_pct, investment_pct, debt_repayment_pct, lifestyle_pct }
    """
    user_id = user.user.id
    data = {
        "user_id": user_id,
        "savings_pct": payload.get("savings_pct", 50),
        "investment_pct": payload.get("investment_pct", 30),
        "debt_repayment_pct": payload.get("debt_repayment_pct", 10),
        "lifestyle_pct": payload.get("lifestyle_pct", 10),
    }
    # Validate: sum should be 100
    total = data["savings_pct"] + data["investment_pct"] + data["debt_repayment_pct"] + data["lifestyle_pct"]
    if abs(total - 100) > 1:
        raise HTTPException(status_code=400, detail=f"Allocation percentages must sum to 100 (got {total})")

    result = db.table("capital_allocation_preferences").upsert(
        data, on_conflict="user_id"
    ).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save preferences")
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════════════
# Surplus & Burn Rate
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/surplus")
def get_surplus(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Calculate and return the user's monthly surplus, burn rate,
    and surplus classification.
    """
    try:
        income_rows, commitments, subs, expenses = _load_user_data(user.user.id, db)
        surplus = calculate_monthly_surplus(income_rows, subs, expenses, commitments)
        return {"status": "ok", **surplus}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# Capital Allocation Recommendation
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/allocation/recommendation")
def get_capital_recommendation(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Return how the user's surplus should be allocated, plus
    reallocation opportunities from wasteful subscriptions.
    """
    try:
        user_id = user.user.id
        income_rows, commitments, subs, expenses = _load_user_data(user_id, db)
        prefs = _load_allocation_prefs(user_id, db)

        # Surplus
        surplus_data = calculate_monthly_surplus(income_rows, subs, expenses, commitments)

        # Subscription risk scores for opportunity scanning
        risk_scores = compute_advanced_behavior_signals(subs, expenses).get("subscription_risk_scores", [])

        # Allocation recommendation
        recommendation = get_allocation_recommendation(
            surplus_amount=surplus_data["monthly_surplus"],
            preferences=prefs,
            subscriptions=subs,
            subscription_risk_scores=risk_scores,
        )

        return {"status": "ok", "surplus": surplus_data, "recommendation": recommendation}
    except Exception as e:
        import traceback
        print(f"[CAPITAL] Allocation recommendation error: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# Capital Trajectory Forecast
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/trajectory")
def get_capital_trajectory(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Generate and return the dual-path capital trajectory forecast.
    Optionally persists a snapshot.
    """
    try:
        user_id = user.user.id
        income_rows, commitments, subs, expenses = _load_user_data(user_id, db)
        prefs = _load_allocation_prefs(user_id, db)

        surplus_data = calculate_monthly_surplus(income_rows, subs, expenses, commitments)
        risk_scores = compute_advanced_behavior_signals(subs, expenses).get("subscription_risk_scores", [])

        # Build reallocation opportunities
        recommendation = get_allocation_recommendation(
            surplus_amount=surplus_data["monthly_surplus"],
            preferences=prefs,
            subscriptions=subs,
            subscription_risk_scores=risk_scores,
        )

        # Forecast
        trajectory = forecast_capital_trajectory(
            monthly_income=surplus_data["monthly_income"],
            monthly_expenses=surplus_data["monthly_expenses"],
            monthly_subscriptions=surplus_data["monthly_subscriptions"],
            reallocation_opportunities=recommendation.get("reallocation_opportunities", []),
            allocation_percentages=recommendation.get("percentages", {}),
        )

        return {
            "status": "ok",
            "surplus": surplus_data,
            "recommendation": recommendation,
            "trajectory": trajectory,
        }
    except Exception as e:
        import traceback
        print(f"[CAPITAL] Trajectory error: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}


@router.post("/trajectory/snapshot")
def save_trajectory_snapshot(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Compute trajectory and persist a snapshot for longitudinal tracking.
    """
    try:
        user_id = user.user.id
        income_rows, commitments, subs, expenses = _load_user_data(user_id, db)
        prefs = _load_allocation_prefs(user_id, db)

        surplus_data = calculate_monthly_surplus(income_rows, subs, expenses, commitments)
        risk_scores = compute_advanced_behavior_signals(subs, expenses).get("subscription_risk_scores", [])

        recommendation = get_allocation_recommendation(
            surplus_amount=surplus_data["monthly_surplus"],
            preferences=prefs,
            subscriptions=subs,
            subscription_risk_scores=risk_scores,
        )

        trajectory = forecast_capital_trajectory(
            monthly_income=surplus_data["monthly_income"],
            monthly_expenses=surplus_data["monthly_expenses"],
            monthly_subscriptions=surplus_data["monthly_subscriptions"],
            reallocation_opportunities=recommendation.get("reallocation_opportunities", []),
            allocation_percentages=recommendation.get("percentages", {}),
        )

        snapshot = {
            "user_id": user_id,
            "monthly_income": surplus_data["monthly_income"],
            "monthly_commitments": surplus_data["monthly_commitments"],
            "monthly_expenses": surplus_data["monthly_expenses"],
            "monthly_subscriptions": surplus_data["monthly_subscriptions"],
            "monthly_surplus": surplus_data["monthly_surplus"],
            "burn_rate": surplus_data["burn_rate"],
            "allocation_snapshot": recommendation.get("percentages", {}),
            "current_path_5y": trajectory["current_path_5y"],
            "disciplined_path_5y": trajectory["disciplined_path_5y"],
            "current_path_10y": trajectory["current_path_10y"],
            "disciplined_path_10y": trajectory["disciplined_path_10y"],
            "forecast_series": trajectory["forecast_series"],
        }

        db.table("capital_trajectory_snapshots").insert(snapshot).execute()
        return {"status": "ok", "snapshot": snapshot}
    except Exception as e:
        import traceback
        print(f"[CAPITAL] Snapshot error: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# Discipline Score
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/discipline-score")
def get_discipline_score(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Compute and return the Capital Discipline Score (0-100).
    Combines burn rate, surplus health, maturity, and behavioural consistency.
    """
    try:
        user_id = user.user.id
        income_rows, commitments, subs, expenses = _load_user_data(user_id, db)

        surplus_data = calculate_monthly_surplus(income_rows, subs, expenses, commitments)
        advanced = compute_advanced_behavior_signals(subs, expenses)

        maturity_score = advanced.get("financial_maturity", {}).get("maturity_index", 50)
        persona_confidence = advanced.get("behavioral_persona", {}).get("confidence", 0.5)

        score = compute_discipline_score(
            burn_rate=surplus_data["burn_rate"],
            surplus_classification=surplus_data["surplus_classification"],
            persona_confidence=persona_confidence,
            maturity_score=maturity_score,
        )

        return {"status": "ok", **score}
    except Exception as e:
        return {"status": "error", "error": str(e)}
