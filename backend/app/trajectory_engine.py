"""
Capital Trajectory Forecast Engine
===================================

Projects the user's capital growth over 5-year and 10-year horizons,
comparing two scenarios:
  1. **Current path** — user continues current spending habits and
     invests whatever surplus exists at a conservative return rate.
  2. **Disciplined path** — user implements recommended discipline
     changes (cancel wasteful subs, reduce discretionary by a target %,
     and allocates the additional surplus optimally).

The delta between these two paths is the **cost of indiscipline** —
a powerful behavioural motivator.

Returns a month-by-month forecast series for charting and headline
numbers for the UI cards.
"""

from typing import List, Dict, Any, Optional
import math


# ── Configuration ───────────────────────────────────────────────────────────

DEFAULT_ANNUAL_RETURN   = 0.08    # 8% expected annual return on invested surplus
DISCIPLINED_SAVING_BUMP = 0.15    # assume 15% more of income can be saved with discipline
MAX_FORECAST_MONTHS     = 120     # 10 years


def forecast_capital_trajectory(
    monthly_income: float,
    monthly_expenses: float,
    monthly_subscriptions: float,
    reallocation_opportunities: Optional[List[Dict[str, Any]]] = None,
    allocation_percentages: Optional[Dict[str, float]] = None,
    annual_return: float = DEFAULT_ANNUAL_RETURN,
) -> Dict[str, Any]:
    """
    Generate a dual-path capital trajectory forecast.

    Parameters
    ----------
    monthly_income : float
        Total normalised monthly income.
    monthly_expenses : float
        Average monthly non-subscription spend.
    monthly_subscriptions : float
        Total monthly subscription commitment.
    reallocation_opportunities : list | None
        Output of capital_allocation_engine._find_reallocation_opportunities().
        Each item has "monthly_cost" representing freed capital.
    allocation_percentages : dict | None
        User's allocation preferences (savings_pct, investment_pct, etc.).
    annual_return : float
        Expected annual return rate (default 8%).

    Returns
    -------
    dict with:
        current_path_5y, disciplined_path_5y,
        current_path_10y, disciplined_path_10y,
        delta_5y, delta_10y,
        monthly_surplus_current, monthly_surplus_disciplined,
        discipline_savings_monthly,
        forecast_series
    """

    monthly_rate = annual_return / 12

    # ── Current path surplus ────────────────────────────────────────────
    current_surplus = max(monthly_income - monthly_expenses - monthly_subscriptions, 0)

    # ── Disciplined path surplus ────────────────────────────────────────
    # 1. Capital freed from cancellable/downgradeable subscriptions
    freed_from_subs = 0.0
    if reallocation_opportunities:
        for opp in reallocation_opportunities:
            freed_from_subs += opp.get("monthly_cost", 0)

    # 2. Additional savings from reducing discretionary spend by DISCIPLINED_SAVING_BUMP
    discretionary_savings = round(monthly_expenses * DISCIPLINED_SAVING_BUMP, 2)

    discipline_extra = freed_from_subs + discretionary_savings
    disciplined_surplus = current_surplus + discipline_extra

    # ── What fraction of surplus is invested? ───────────────────────────
    inv_pct = 30.0  # default
    if allocation_percentages:
        inv_pct = allocation_percentages.get("investment", 30.0)
    # For projection we consider savings + investment as "growing capital"
    sav_pct = 50.0
    if allocation_percentages:
        sav_pct = allocation_percentages.get("savings", 50.0)
    growth_pct = (inv_pct + sav_pct) / 100.0  # fraction that compounds

    current_monthly_invested    = round(current_surplus * growth_pct, 2)
    disciplined_monthly_invested = round(disciplined_surplus * growth_pct, 2)

    # ── Month-by-month compound growth ──────────────────────────────────
    forecast_series: List[Dict[str, Any]] = []
    current_capital = 0.0
    disciplined_capital = 0.0

    for month in range(1, MAX_FORECAST_MONTHS + 1):
        # compound existing + add new contribution
        current_capital = current_capital * (1 + monthly_rate) + current_monthly_invested
        disciplined_capital = disciplined_capital * (1 + monthly_rate) + disciplined_monthly_invested

        # record at yearly intervals and key milestones
        if month % 12 == 0 or month == 60 or month == 1:
            forecast_series.append({
                "month": month,
                "year": round(month / 12, 1),
                "current_path": round(current_capital, 2),
                "disciplined_path": round(disciplined_capital, 2),
                "delta": round(disciplined_capital - current_capital, 2),
            })

    # ── Extract headline numbers ────────────────────────────────────────
    def _value_at_month(m: int, monthly_invest: float) -> float:
        if monthly_rate == 0:
            return monthly_invest * m
        return monthly_invest * (((1 + monthly_rate) ** m - 1) / monthly_rate)

    current_5y      = round(_value_at_month(60, current_monthly_invested), 2)
    disciplined_5y  = round(_value_at_month(60, disciplined_monthly_invested), 2)
    current_10y     = round(_value_at_month(120, current_monthly_invested), 2)
    disciplined_10y = round(_value_at_month(120, disciplined_monthly_invested), 2)

    return {
        "current_path_5y": current_5y,
        "disciplined_path_5y": disciplined_5y,
        "current_path_10y": current_10y,
        "disciplined_path_10y": disciplined_10y,
        "delta_5y": round(disciplined_5y - current_5y, 2),
        "delta_10y": round(disciplined_10y - current_10y, 2),
        "monthly_surplus_current": round(current_surplus, 2),
        "monthly_surplus_disciplined": round(disciplined_surplus, 2),
        "discipline_savings_monthly": round(discipline_extra, 2),
        "current_monthly_invested": current_monthly_invested,
        "disciplined_monthly_invested": disciplined_monthly_invested,
        "forecast_series": forecast_series,
    }


def compute_discipline_score(
    burn_rate: float,
    surplus_classification: str,
    persona_confidence: float = 0.5,
    maturity_score: int = 50,
) -> Dict[str, Any]:
    """
    Compute a 0-100 Capital Discipline Score combining surplus health,
    burn rate, maturity, and behavioral consistency.

    This is the flagship metric of the Capital Discipline Engine.
    """

    # ── Component scores (each 0-25) ───────────────────────────────────
    # 1. Burn rate component (lower is better)
    if burn_rate <= 0.5:
        burn_component = 25
    elif burn_rate <= 0.7:
        burn_component = 20
    elif burn_rate <= 0.85:
        burn_component = 12
    elif burn_rate <= 1.0:
        burn_component = 5
    else:
        burn_component = 0

    # 2. Surplus health component
    surplus_map = {
        "Healthy": 25,
        "Moderate": 18,
        "Thin": 10,
        "Deficit": 0,
        "No Income Data": 0,
    }
    surplus_component = surplus_map.get(surplus_classification, 10)

    # 3. Maturity component (scale 0-100 → 0-25)
    maturity_component = round(maturity_score * 0.25)

    # 4. Behavioural consistency (persona confidence as proxy)
    consistency_component = round(persona_confidence * 25)

    total = burn_component + surplus_component + maturity_component + consistency_component
    total = min(100, max(0, total))

    if total >= 80:
        label = "Elite Discipline"
    elif total >= 60:
        label = "Strong Discipline"
    elif total >= 40:
        label = "Developing Discipline"
    elif total >= 20:
        label = "Weak Discipline"
    else:
        label = "No Discipline"

    return {
        "discipline_score": total,
        "label": label,
        "components": {
            "burn_rate": burn_component,
            "surplus_health": surplus_component,
            "maturity": maturity_component,
            "consistency": consistency_component,
        },
    }
