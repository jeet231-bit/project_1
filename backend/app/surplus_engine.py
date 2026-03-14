"""
Surplus & Burn Rate Engine
==========================

Calculates the user's investable surplus by comparing total monthly income
against fixed commitments (subscriptions) and average discretionary spending
(expenses).

Core formula:
    Monthly Surplus = Total Monthly Income
                    − Fixed Commitments
                    − Monthly Subscription Commitment
                    − Average Discretionary Expenses

Burn Rate = (Commitments + Subscriptions + Avg Expenses) / Income

This is the foundational module for the Capital Discipline Engine.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict


# ─── Helpers ────────────────────────────────────────────────────────────────

def _normalise_to_monthly(amount: float, frequency: str) -> float:
    """Convert any frequency amount to its monthly equivalent."""
    freq = frequency.lower().strip()
    if freq == "yearly" or freq == "annual":
        return round(amount / 12, 2)
    if freq == "weekly":
        return round(amount * 4.33, 2)        # avg weeks per month
    if freq == "biweekly" or freq == "fortnightly":
        return round(amount * 2.17, 2)
    if freq == "quarterly":
        return round(amount / 3, 2)
    # default: already monthly
    return round(amount, 2)


def _average_monthly_expenses(expenses: List[Any], months: int = 3) -> float:
    """
    Compute the average monthly expense over the last N months.
    Uses actual expense dates, not calendar months.
    """
    cutoff = datetime.utcnow() - timedelta(days=months * 31)
    monthly_buckets: Dict[str, float] = defaultdict(float)

    for e in expenses:
        d = getattr(e, "date", None)
        if d is None:
            continue
        if isinstance(d, str):
            try:
                d = datetime.fromisoformat(d.split("+")[0].replace("Z", ""))
            except ValueError:
                continue
        elif not isinstance(d, datetime):
            try:
                d = datetime.combine(d, datetime.min.time())
            except Exception:
                continue

        if d >= cutoff:
            key = d.strftime("%Y-%m")
            monthly_buckets[key] += getattr(e, "amount", 0)

    if not monthly_buckets:
        return 0.0

    return round(sum(monthly_buckets.values()) / len(monthly_buckets), 2)


# ─── Public API ─────────────────────────────────────────────────────────────

def calculate_monthly_surplus(
    income_rows: List[Any],
    subscriptions: List[Any],
    expenses: List[Any],
    commitments: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Compute the user's monthly surplus and burn rate.

    Parameters
    ----------
    income_rows : list
        Objects with .source, .amount, .frequency, .is_active
    subscriptions : list
        Objects with .amount, .billing_cycle, .status
    expenses : list
        Objects with .amount, .date, .category
    commitments : list | None
        Objects with .name, .amount, .frequency, .is_active, .category
        (fixed obligations like rent, EMI, insurance)

    Returns
    -------
    dict with:
        monthly_income, monthly_expenses, monthly_subscriptions,
        monthly_commitments, monthly_surplus, burn_rate,
        income_sources, commitment_breakdown, surplus_classification,
        capital_lock_in_ratio
    """

    # ── Total monthly income ──
    income_sources = []
    total_monthly_income = 0.0
    for inc in income_rows:
        if not getattr(inc, "is_active", True):
            continue
        monthly_amt = _normalise_to_monthly(
            getattr(inc, "amount", 0),
            getattr(inc, "frequency", "monthly"),
        )
        total_monthly_income += monthly_amt
        income_sources.append({
            "source": getattr(inc, "source", "Unknown"),
            "raw_amount": getattr(inc, "amount", 0),
            "frequency": getattr(inc, "frequency", "monthly"),
            "monthly_equivalent": monthly_amt,
        })

    # ── Monthly subscription commitment ──
    total_monthly_subs = 0.0
    for s in subscriptions:
        if getattr(s, "status", "active") != "active":
            continue
        cycle = getattr(s, "billing_cycle", "monthly").lower()
        amt = getattr(s, "amount", 0)
        total_monthly_subs += _normalise_to_monthly(amt, cycle)
    total_monthly_subs = round(total_monthly_subs, 2)

    # ── Fixed commitments (rent, EMI, insurance, etc.) ──
    total_monthly_commitments = 0.0
    commitment_breakdown = []
    for c in (commitments or []):
        if not getattr(c, "is_active", True):
            continue
        monthly_amt = _normalise_to_monthly(
            getattr(c, "amount", 0),
            getattr(c, "frequency", "monthly"),
        )
        total_monthly_commitments += monthly_amt
        commitment_breakdown.append({
            "name": getattr(c, "name", "Unknown"),
            "category": getattr(c, "category", "General"),
            "raw_amount": getattr(c, "amount", 0),
            "frequency": getattr(c, "frequency", "monthly"),
            "monthly_equivalent": monthly_amt,
        })
    total_monthly_commitments = round(total_monthly_commitments, 2)

    # ── Average discretionary expenses (3-month lookback) ──
    avg_monthly_exp = _average_monthly_expenses(expenses, months=3)

    # ── Surplus & burn rate ──
    # True investable surplus = income − commitments − subscriptions − avg discretionary
    total_outflow = total_monthly_commitments + total_monthly_subs + avg_monthly_exp
    monthly_surplus = round(total_monthly_income - total_outflow, 2)

    if total_monthly_income > 0:
        burn_rate = round(total_outflow / total_monthly_income, 3)
    else:
        burn_rate = 0.0

    # Capital lock-in ratio: what % of income is consumed by fixed obligations
    if total_monthly_income > 0:
        capital_lock_in = round(
            (total_monthly_commitments + total_monthly_subs) / total_monthly_income, 3
        )
    else:
        capital_lock_in = 0.0

    # ── Classification ──
    if total_monthly_income == 0:
        classification = "No Income Data"
    elif monthly_surplus <= 0:
        classification = "Deficit"
    elif burn_rate >= 0.85:
        classification = "Thin"
    elif burn_rate >= 0.70:
        classification = "Moderate"
    else:
        classification = "Healthy"

    return {
        "monthly_income": round(total_monthly_income, 2),
        "monthly_commitments": total_monthly_commitments,
        "monthly_expenses": avg_monthly_exp,
        "monthly_subscriptions": total_monthly_subs,
        "monthly_surplus": monthly_surplus,
        "burn_rate": burn_rate,
        "capital_lock_in_ratio": capital_lock_in,
        "income_sources": income_sources,
        "commitment_breakdown": commitment_breakdown,
        "surplus_classification": classification,
    }
