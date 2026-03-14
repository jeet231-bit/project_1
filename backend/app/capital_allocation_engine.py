"""
Capital Allocation Engine
=========================

Given the user's monthly surplus and their preferred allocation split,
this module:
  1. Computes how the surplus should be distributed (savings, investment,
     debt repayment, lifestyle).
  2. Identifies reallocation opportunities — capital that can be freed
     from cancellable subscriptions, reducible categories, or plan switches,
     and recommends where that freed capital should flow.

The output feeds both the Lex assistant (system prompt context) and the
Capital Trajectory Forecast engine.
"""

from typing import List, Dict, Any

# ── Default allocation when user has no preferences stored ──────────────────

DEFAULT_ALLOCATION = {
    "savings_pct": 50.0,
    "investment_pct": 30.0,
    "debt_repayment_pct": 10.0,
    "lifestyle_pct": 10.0,
}


def _get_pct(prefs: Any, key: str, default: float) -> float:
    """Safely extract a percentage from a prefs dict or object."""
    if isinstance(prefs, dict):
        return float(prefs.get(key, default))
    return float(getattr(prefs, key, default))


# ─── Public API ─────────────────────────────────────────────────────────────

def get_allocation_recommendation(
    surplus_amount: float,
    preferences: Any = None,
    subscriptions: Any = None,
    subscription_risk_scores: Any = None,
) -> Dict[str, Any]:
    """
    Distribute the monthly surplus according to user preferences and
    surface reallocation opportunities from wasteful subscriptions.

    Parameters
    ----------
    surplus_amount : float
        Net monthly surplus (can be negative for deficits).
    preferences : dict | object | None
        Stored allocation preferences with *_pct fields.
    subscriptions : list | None
        Active subscription objects for opportunity scanning.
    subscription_risk_scores : list | None
        Output of behavior_engine._subscription_risk_scores().

    Returns
    -------
    dict with: surplus, allocations, percentages, reallocation_opportunities
    """

    prefs = preferences or DEFAULT_ALLOCATION

    # ── Resolve percentages ─────────────────────────────────────────────
    savings_pct     = _get_pct(prefs, "savings_pct", 50)
    investment_pct  = _get_pct(prefs, "investment_pct", 30)
    debt_pct        = _get_pct(prefs, "debt_repayment_pct", 10)
    lifestyle_pct   = _get_pct(prefs, "lifestyle_pct", 10)

    # Normalise to 100%
    total_pct = savings_pct + investment_pct + debt_pct + lifestyle_pct
    if total_pct == 0:
        total_pct = 100
    factor = 100.0 / total_pct

    savings_pct     = round(savings_pct * factor, 1)
    investment_pct  = round(investment_pct * factor, 1)
    debt_pct        = round(debt_pct * factor, 1)
    lifestyle_pct   = round(lifestyle_pct * factor, 1)

    effective_surplus = max(surplus_amount, 0)

    allocations = {
        "savings":        round(effective_surplus * savings_pct / 100, 2),
        "investment":     round(effective_surplus * investment_pct / 100, 2),
        "debt_repayment": round(effective_surplus * debt_pct / 100, 2),
        "lifestyle":      round(effective_surplus * lifestyle_pct / 100, 2),
    }

    percentages = {
        "savings":        savings_pct,
        "investment":     investment_pct,
        "debt_repayment": debt_pct,
        "lifestyle":      lifestyle_pct,
    }

    # ── Reallocation opportunities ──────────────────────────────────────
    opportunities = _find_reallocation_opportunities(
        subscriptions or [],
        subscription_risk_scores or [],
        percentages,
    )

    return {
        "surplus": surplus_amount,
        "allocations": allocations,
        "percentages": percentages,
        "reallocation_opportunities": opportunities,
    }


def _find_reallocation_opportunities(
    subscriptions: List[Any],
    risk_scores: List[Dict[str, Any]],
    percentages: Dict[str, float],
) -> List[Dict[str, Any]]:
    """
    Identify subscriptions that could be cancelled/downgraded and
    suggest where the freed capital should go.
    """
    opportunities: List[Dict[str, Any]] = []

    # Build a lookup: sub_name → risk info
    risk_lookup: Dict[str, Dict[str, Any]] = {}
    for rs in risk_scores:
        name = rs.get("name", "")
        if name:
            risk_lookup[name] = rs

    for s in subscriptions:
        name = getattr(s, "name", "")
        status = getattr(s, "status", "active")
        if status != "active":
            continue

        risk = risk_lookup.get(name, {})
        risk_score = risk.get("risk_score", 0)
        risk_level = risk.get("risk_level", "low")

        if risk_score < 40:
            continue  # Not worth flagging

        amount = getattr(s, "amount", 0)
        cycle = getattr(s, "billing_cycle", "monthly").lower()
        monthly_cost = amount if cycle == "monthly" else round(amount / 12, 2)

        # Suggest how freed capital would be allocated
        freed_allocation = {
            "savings":        round(monthly_cost * percentages.get("savings", 50) / 100, 2),
            "investment":     round(monthly_cost * percentages.get("investment", 30) / 100, 2),
            "debt_repayment": round(monthly_cost * percentages.get("debt_repayment", 10) / 100, 2),
            "lifestyle":      round(monthly_cost * percentages.get("lifestyle", 10) / 100, 2),
        }

        # Compute 5-year investment projection (8% annual return, compounding monthly)
        monthly_rate = 0.08 / 12
        months = 60
        if monthly_rate > 0:
            fv = monthly_cost * (((1 + monthly_rate) ** months - 1) / monthly_rate)
        else:
            fv = monthly_cost * months

        opportunities.append({
            "subscription_name": name,
            "monthly_cost": monthly_cost,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "action": "cancel_subscription" if risk_score >= 60 else "switch_plan",
            "label": f"Cancel {name}" if risk_score >= 60 else f"Downgrade {name}",
            "freed_allocation": freed_allocation,
            "projected_5y_value": round(fv, 2),
            "narrative": (
                f"Cancelling {name} frees ₹{monthly_cost}/mo. "
                f"Investing that at 8% p.a. grows to ₹{round(fv):,} in 5 years."
            ),
        })

    # Sort by projected value descending
    opportunities.sort(key=lambda x: x["projected_5y_value"], reverse=True)
    return opportunities
