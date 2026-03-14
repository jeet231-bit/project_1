"""
Behavior Intelligence Engine
=============================

Computes structured behavioral metrics from raw expense + subscription data.
These signals are injected into the Lex context so OpenAI reasons over
proprietary intelligence, not raw transactions.

Phase 1 — Descriptive Analytics
--------------------------------
1. Spend Volatility Index        — Instability / impulsiveness detection
2. Category Concentration Index  — Herfindahl-inspired lifestyle overexposure
3. Subscription Burden Ratio     — Recurring vs total spend pressure
4. Recurring Creep Indicator     — Subscription growth velocity
5. Weekend Spend Bias            — Leisure vs weekday spend ratio

Phase 2 — Predictive + Composite Intelligence
----------------------------------------------
6. Subscription Risk Scoring     — Per-sub 0–100 predictive waste score
7. Lifestyle Drift Detection     — 90-day temporal shift analysis
8. Financial Maturity Index      — Composite 0–100 flagship score
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
import math


# ─── Helpers ────────────────────────────────────────────────────────────────

def _parse_date(d: Any) -> datetime:
    """Robust date parser for string or datetime objects."""
    if isinstance(d, datetime):
        return d
    if isinstance(d, str):
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
            try:
                return datetime.strptime(d.split("+")[0].replace("Z", ""), fmt)
            except ValueError:
                continue
    return datetime.utcnow()  # fallback to now


def _bucket_expenses_by_month(expenses: List[Any], months: int = 6) -> Dict[str, float]:
    """Group expenses into YYYY-MM buckets for the last N months."""
    cutoff = datetime.utcnow() - timedelta(days=months * 31)
    buckets: Dict[str, float] = defaultdict(float)
    for e in expenses:
        d = _parse_date(getattr(e, "date", None))
        if d >= cutoff:
            key = d.strftime("%Y-%m")
            buckets[key] += getattr(e, "amount", 0)
    return dict(buckets)


# ─── 1. Spend Volatility Index ─────────────────────────────────────────────

def _spend_volatility(expenses: List[Any]) -> Dict[str, Any]:
    """
    Standard deviation of monthly spend over the last 6 months,
    normalized to a 0–100 score.
    """
    monthly = _bucket_expenses_by_month(expenses, months=6)
    values = list(monthly.values())

    if len(values) < 2:
        return {
            "volatility_score": 0,
            "classification": "Insufficient Data",
            "trend": "unknown",
            "monthly_totals": monthly,
        }

    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std_dev = math.sqrt(variance)

    # Normalize: assume ₹10,000 std_dev = 100 score (capped)
    raw_score = min(100, round((std_dev / max(mean, 1)) * 100))

    # Trend: compare last 2 months
    sorted_months = sorted(monthly.keys())
    if len(sorted_months) >= 2:
        recent = monthly[sorted_months[-1]]
        prev = monthly[sorted_months[-2]]
        trend = "increasing" if recent > prev * 1.1 else "decreasing" if recent < prev * 0.9 else "stable"
    else:
        trend = "unknown"

    classification = "High" if raw_score >= 60 else "Medium" if raw_score >= 30 else "Low"

    return {
        "volatility_score": raw_score,
        "classification": classification,
        "trend": trend,
        "monthly_totals": monthly,
    }


# ─── 2. Category Concentration Index ───────────────────────────────────────

def _category_concentration(expenses: List[Any]) -> Dict[str, Any]:
    """
    Herfindahl-inspired index: sum of (category_share)^2.
    High score = concentrated spending in few categories.
    """
    cat_totals: Dict[str, float] = defaultdict(float)
    total = 0.0
    for e in expenses:
        amt = getattr(e, "amount", 0)
        cat = getattr(e, "category", "Other")
        cat_totals[cat] += amt
        total += amt

    if total == 0:
        return {
            "concentration_score": 0,
            "dominant_category": None,
            "category_shares": {},
        }

    shares = {cat: round(amt / total, 3) for cat, amt in cat_totals.items()}
    hhi = round(sum(s ** 2 for s in shares.values()), 3)
    dominant = max(cat_totals, key=cat_totals.get)  # type: ignore

    return {
        "concentration_score": hhi,
        "dominant_category": dominant,
        "category_shares": shares,
    }


# ─── 3. Subscription Burden Ratio ──────────────────────────────────────────

def _subscription_burden(subscriptions: List[Any], expenses: List[Any]) -> Dict[str, Any]:
    """
    monthly_subscription_spend / total_monthly_spend.
    """
    monthly_sub = sum(
        getattr(s, "amount", 0) if getattr(s, "billing_cycle", "monthly") == "monthly"
        else getattr(s, "amount", 0) / 12
        for s in subscriptions
        if getattr(s, "status", "active") == "active"
    )

    # Use this month's expenses + subs as "total monthly"
    now = datetime.utcnow()
    monthly_exp = sum(
        getattr(e, "amount", 0)
        for e in expenses
        if _parse_date(getattr(e, "date", None)).month == now.month
        and _parse_date(getattr(e, "date", None)).year == now.year
    )

    total = monthly_sub + monthly_exp
    if total == 0:
        return {"burden_ratio": 0, "risk_level": "N/A", "monthly_sub_spend": 0, "total_monthly": 0}

    ratio = round(monthly_sub / total, 3)
    risk = "Critical" if ratio > 0.5 else "Elevated" if ratio > 0.35 else "Healthy"

    return {
        "burden_ratio": ratio,
        "risk_level": risk,
        "monthly_sub_spend": round(monthly_sub, 2),
        "total_monthly": round(total, 2),
    }


# ─── 4. Recurring Creep Indicator ──────────────────────────────────────────

def _recurring_creep(subscriptions: List[Any]) -> Dict[str, Any]:
    """
    Detect subscriptions added in the last 60 days and compute
    the delta in monthly commitment.
    """
    sixty_days_ago = datetime.utcnow() - timedelta(days=60)
    new_subs = []
    delta = 0.0

    for s in subscriptions:
        created = getattr(s, "created_at", None) or getattr(s, "createdAt", None)
        if created:
            cd = _parse_date(created)
            if cd >= sixty_days_ago and getattr(s, "status", "active") == "active":
                amt = getattr(s, "amount", 0)
                if getattr(s, "billing_cycle", "monthly") != "monthly":
                    amt = amt / 12
                new_subs.append({"name": getattr(s, "name", "?"), "monthly_cost": round(amt, 2)})
                delta += amt

    return {
        "new_subscriptions_60d": len(new_subs),
        "delta_monthly_commitment": round(delta, 2),
        "new_services": new_subs,
    }


# ─── 5. Weekend Spend Bias ─────────────────────────────────────────────────

def _weekend_bias(expenses: List[Any]) -> Dict[str, Any]:
    """
    weekend_spend / total_spend ratio.
    Weekend = Saturday (5) + Sunday (6).
    """
    weekend_total = 0.0
    total = 0.0

    for e in expenses:
        amt = getattr(e, "amount", 0)
        total += amt
        d = _parse_date(getattr(e, "date", None))
        if d.weekday() >= 5:  # Sat=5, Sun=6
            weekend_total += amt

    if total == 0:
        return {"weekend_ratio": 0, "pattern": "No data"}

    ratio = round(weekend_total / total, 3)

    # 2/7 ≈ 0.286 is "even" distribution
    if ratio > 0.4:
        pattern = "Leisure-skewed"
    elif ratio > 0.28:
        pattern = "Balanced"
    else:
        pattern = "Weekday-heavy"

    return {
        "weekend_ratio": ratio,
        "pattern": pattern,
        "weekend_spend": round(weekend_total, 2),
        "weekday_spend": round(total - weekend_total, 2),
    }


# ─── Composite: Full Behavior Report ───────────────────────────────────────

def compute_behavior_metrics(
    subscriptions: List[Any],
    expenses: List[Any],
) -> Dict[str, Any]:
    """
    Run all 5 Phase 1 behavior intelligence modules and return a structured
    metrics dict ready for injection into the Lex system prompt.
    """
    return {
        "spend_volatility": _spend_volatility(expenses),
        "category_concentration": _category_concentration(expenses),
        "subscription_burden": _subscription_burden(subscriptions, expenses),
        "recurring_creep": _recurring_creep(subscriptions),
        "weekend_bias": _weekend_bias(expenses),
    }


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2 — Predictive + Composite Modeling
# ═══════════════════════════════════════════════════════════════════════════


# ─── 6. Subscription Risk Scoring (Predictive) ────────────────────────────

def _subscription_risk_scores(
    subscriptions: List[Any],
    expenses: List[Any],
) -> List[Dict[str, Any]]:
    """
    Score each active subscription 0–100 on waste risk.

    Factors (weighted):
        30%  cost_score        — high cost relative to total monthly spend
        20%  redundancy_score  — category overlap with other active subs
        20%  tenure_score      — long tenure approximation (older = higher risk of staleness)
        15%  creep_score       — recently added (recency penalty)
        15%  overlap_score     — multiple subs in the same subcategory
    """
    active_subs = [s for s in subscriptions if getattr(s, "status", "active") == "active"]
    if not active_subs:
        return []

    # ── Total monthly spend baseline ──
    now = datetime.utcnow()
    monthly_exp = sum(
        getattr(e, "amount", 0)
        for e in expenses
        if _parse_date(getattr(e, "date", None)).month == now.month
        and _parse_date(getattr(e, "date", None)).year == now.year
    )
    monthly_sub = sum(
        _monthly_amount(s) for s in active_subs
    )
    total_monthly = monthly_sub + monthly_exp or 1

    # ── Category counts (for overlap) ──
    cat_counts: Dict[str, int] = defaultdict(int)
    for s in active_subs:
        cat_counts[getattr(s, "category", "General")] += 1

    scores: List[Dict[str, Any]] = []

    for s in active_subs:
        m_amt = _monthly_amount(s)
        drivers: List[str] = []

        # 1. Cost score: how large is this sub relative to total spend?
        cost_ratio = m_amt / total_monthly
        cost_score = min(100, round(cost_ratio * 400))  # 25% of spend → 100
        if cost_score >= 50:
            drivers.append("High cost relative to total monthly spend")

        # 2. Redundancy score: how many subs share this category?
        cat = getattr(s, "category", "General")
        peers_in_cat = cat_counts.get(cat, 1)
        redundancy_score = min(100, round((peers_in_cat - 1) * 40))  # 1 peer=0, 2 peers=40, 3+=80+
        if redundancy_score >= 40:
            drivers.append(f"Redundant {cat} category exposure ({peers_in_cat} services)")

        # 3. Tenure score: older subs may be stale
        created = getattr(s, "created_at", None) or getattr(s, "createdAt", None)
        if created:
            age_days = (now - _parse_date(created)).days
            tenure_score = min(100, round(age_days / 3.65))  # 365 days → ~100
        else:
            tenure_score = 50  # unknown tenure, assume moderate risk
        if tenure_score >= 60:
            drivers.append("Long-tenured subscription — may be underutilised")

        # 4. Creep score: recently added subs get a mild risk flag
        if created:
            age_days = (now - _parse_date(created)).days
            creep_score = max(0, 100 - round(age_days * 1.5))  # brand new=100, 67d+=0
        else:
            creep_score = 0
        if creep_score >= 50:
            drivers.append("Recently added — evaluate necessity")

        # 5. Category overlap: expense-side redundancy
        cat_expense = sum(
            getattr(e, "amount", 0)
            for e in expenses
            if getattr(e, "category", "").lower() == cat.lower()
        )
        expense_overlap_ratio = cat_expense / total_monthly if total_monthly else 0
        overlap_score = min(100, round(expense_overlap_ratio * 300))
        if overlap_score >= 40:
            drivers.append(f"Heavy {cat} expense overlap ({round(expense_overlap_ratio*100)}% of total)")

        # ── Weighted composite ──
        risk_score = round(
            0.30 * cost_score +
            0.20 * redundancy_score +
            0.20 * tenure_score +
            0.15 * creep_score +
            0.15 * overlap_score
        )
        risk_score = max(0, min(100, risk_score))

        risk_level = "High" if risk_score >= 65 else "Medium" if risk_score >= 35 else "Low"

        scores.append({
            "subscription_id": getattr(s, "id", None),
            "name": getattr(s, "name", "?"),
            "amount": m_amt,
            "category": cat,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "drivers": drivers if drivers else ["No significant risk drivers detected"],
        })

    # Sort by risk descending
    scores.sort(key=lambda x: x["risk_score"], reverse=True)
    return scores


def _monthly_amount(s: Any) -> float:
    """Normalize a subscription to monthly cost."""
    amt = getattr(s, "amount", 0)
    cycle = getattr(s, "billing_cycle", "monthly").lower()
    if cycle == "yearly" or cycle == "annual":
        return round(amt / 12, 2)
    return round(amt, 2)


# ─── 7. Lifestyle Drift Detector (Temporal 90d/90d) ───────────────────────

def _lifestyle_drift(expenses: List[Any]) -> Dict[str, Any]:
    """
    Compare spending patterns:  last 90 days  vs  previous 90 days.
    Flag categories with > 20% directional change.
    """
    now = datetime.utcnow()
    recent_cutoff = now - timedelta(days=90)
    baseline_cutoff = now - timedelta(days=180)

    recent_cats: Dict[str, float] = defaultdict(float)
    baseline_cats: Dict[str, float] = defaultdict(float)

    for e in expenses:
        d = _parse_date(getattr(e, "date", None))
        cat = getattr(e, "category", "Other")
        amt = getattr(e, "amount", 0)

        if d >= recent_cutoff:
            recent_cats[cat] += amt
        elif d >= baseline_cutoff:
            baseline_cats[cat] += amt

    # Compute drift per category
    all_cats = set(list(recent_cats.keys()) + list(baseline_cats.keys()))
    drifts: List[Dict[str, Any]] = []

    for cat in all_cats:
        recent_val = recent_cats.get(cat, 0)
        baseline_val = baseline_cats.get(cat, 0)

        if baseline_val > 0:
            change_pct = round(((recent_val - baseline_val) / baseline_val) * 100)
        elif recent_val > 0:
            change_pct = 100  # New category (infinite increase, cap at 100)
        else:
            continue

        if abs(change_pct) >= 20:
            direction = "increase" if change_pct > 0 else "decrease"
            drifts.append({
                "category": cat,
                "recent_spend": round(recent_val, 2),
                "baseline_spend": round(baseline_val, 2),
                "change_pct": change_pct,
                "direction": direction,
            })

    drifts.sort(key=lambda x: abs(x["change_pct"]), reverse=True)

    return {
        "drift_detected": len(drifts) > 0,
        "drift_count": len(drifts),
        "categories": drifts,
    }


# ─── 8. Financial Maturity Index (Composite 0–100) ────────────────────────

def _financial_maturity_index(
    subscriptions: List[Any],
    expenses: List[Any],
    volatility: Dict[str, Any],
    burden: Dict[str, Any],
    concentration: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Composite flagship score aggregating 5 dimensions:

    Component               Weight   Ideal
    ─────────────────────────────────────
    Spend Stability          25%     Low volatility
    Subscription Burden      20%     Low burden ratio
    Category Diversity       15%     Moderate HHI (diversified)
    Savings Ratio            25%     High savings vs income
    Debt Load                15%     Low debt
    """

    strengths: List[str] = []
    weaknesses: List[str] = []

    # 1. Spend Stability (inverse of volatility) → higher = more mature
    vol_score = volatility.get("volatility_score", 50)
    stability_score = max(0, 100 - vol_score)
    if stability_score >= 70:
        strengths.append("Strong spend stability")
    elif stability_score < 40:
        weaknesses.append("High spend volatility")

    # 2. Subscription Burden (inverse) → lower burden = more mature
    burden_ratio = burden.get("burden_ratio", 0.3)
    burden_score = max(0, round(100 - burden_ratio * 200))  # 0%→100, 50%→0
    if burden_score >= 70:
        strengths.append("Healthy subscription burden")
    elif burden_score < 40:
        weaknesses.append("Elevated subscription burden")

    # 3. Category Diversity (inverse of HHI) → lower concentration = more mature
    hhi = concentration.get("concentration_score", 0.5)
    diversity_score = max(0, round(100 - hhi * 100))  # HHI 0→100, HHI 1→0
    if diversity_score >= 70:
        strengths.append("Well-diversified spending")
    elif diversity_score < 40:
        weaknesses.append("Spending concentrated in few categories")

    # 4. Savings Ratio approximation
    #    We estimate: if monthly spend is significantly less than a reasonable
    #    income estimate, the user is saving. Since we don't have income data,
    #    we use a heuristic: savings_score = 100 - (monthly_spend / estimated_income * 100)
    #    Estimated income = total monthly spend * 1.5 (assume 67% spend-to-income)
    now = datetime.utcnow()
    monthly_exp = sum(
        getattr(e, "amount", 0)
        for e in expenses
        if _parse_date(getattr(e, "date", None)).month == now.month
        and _parse_date(getattr(e, "date", None)).year == now.year
    )
    monthly_sub = burden.get("monthly_sub_spend", 0)
    total_monthly = monthly_exp + monthly_sub

    # Without income data, we assess spending discipline via spend trajectory
    monthly_buckets = _bucket_expenses_by_month(expenses, months=3)
    bucket_vals = sorted(monthly_buckets.values()) if monthly_buckets else [0]
    if len(bucket_vals) >= 2:
        # Savings proxy: spending declining or stable = good discipline
        recent_avg = sum(bucket_vals[-2:]) / 2
        older_avg = bucket_vals[0] if len(bucket_vals) == 2 else sum(bucket_vals[:-2]) / max(1, len(bucket_vals) - 2)
        if older_avg > 0:
            spend_change = (recent_avg - older_avg) / older_avg
            savings_score = max(0, min(100, round(70 - spend_change * 100)))
        else:
            savings_score = 50
    else:
        savings_score = 50  # not enough data
    if savings_score >= 70:
        strengths.append("Improving spend discipline")
    elif savings_score < 40:
        weaknesses.append("Spending trend increasing")

    # 5. Debt Load — approximated from EMI/loan-like expenses
    debt_keywords = ["emi", "loan", "mortgage", "credit card", "debt"]
    debt_total = sum(
        getattr(e, "amount", 0)
        for e in expenses
        if any(kw in (getattr(e, "name", "") or "").lower() for kw in debt_keywords)
        or any(kw in (getattr(e, "category", "") or "").lower() for kw in debt_keywords)
    )
    debt_ratio = debt_total / max(total_monthly, 1)
    debt_score = max(0, min(100, round(100 - debt_ratio * 250)))  # 40% debt → 0
    if debt_score >= 70:
        strengths.append("Low debt load")
    elif debt_score < 40:
        weaknesses.append("Elevated debt obligations")

    # ── Weighted composite ──
    maturity_index = round(
        0.25 * stability_score +
        0.20 * burden_score +
        0.15 * diversity_score +
        0.25 * savings_score +
        0.15 * debt_score
    )
    maturity_index = max(0, min(100, maturity_index))

    # Classification bands
    if maturity_index >= 80:
        classification = "Advanced"
    elif maturity_index >= 60:
        classification = "Developing"
    elif maturity_index >= 40:
        classification = "Foundation"
    else:
        classification = "At Risk"

    return {
        "maturity_index": maturity_index,
        "classification": classification,
        "strengths": strengths if strengths else ["Building financial foundation"],
        "weaknesses": weaknesses if weaknesses else ["No critical weaknesses detected"],
        "components": {
            "spend_stability": stability_score,
            "subscription_burden": burden_score,
            "category_diversity": diversity_score,
            "savings_discipline": savings_score,
            "debt_load": debt_score,
        },
    }


# ─── Phase 2 Composite ─────────────────────────────────────────────────────

def compute_advanced_behavior_signals(
    subscriptions: List[Any],
    expenses: List[Any],
) -> Dict[str, Any]:
    """
    Run Phase 2 intelligence layer (predictive + composite).
    Consumes Phase 1 outputs for compound metrics (maturity index).
    """
    # Phase 1 inputs needed for Phase 2
    volatility = _spend_volatility(expenses)
    burden = _subscription_burden(subscriptions, expenses)
    concentration = _category_concentration(expenses)

    maturity = _financial_maturity_index(
        subscriptions, expenses, volatility, burden, concentration
    )
    drift = _lifestyle_drift(expenses)
    weekend = _weekend_bias(expenses)

    # Deterministic persona classification (rule-based)
    persona = _classify_behavioral_persona(
        volatility, burden, concentration, drift, weekend
    )

    return {
        "subscription_risk_scores": _subscription_risk_scores(subscriptions, expenses),
        "lifestyle_drift": drift,
        "financial_maturity": maturity,
        "behavioral_persona": persona,
    }


# ─── 9. Behavioral Persona Classifier (Deterministic) ─────────────────────

PERSONA_DEFINITIONS = {
    "The Optimizer": {
        "description": "Disciplined spender with low volatility and minimal subscription burden. Spending is intentional and well-controlled.",
        "traits": ["Low volatility", "Low subscription burden", "Stable patterns"],
    },
    "The Drifter": {
        "description": "Spending patterns are shifting — lifestyle inflation is creeping in through discretionary categories.",
        "traits": ["High lifestyle drift", "Rising discretionary spend", "Category shifts"],
    },
    "The Subscribed": {
        "description": "Recurring commitments dominate the financial profile. Monthly subscription spend is disproportionately high.",
        "traits": ["High subscription burden", "Multiple active services", "Recurring creep risk"],
    },
    "The Impulsive": {
        "description": "Spending spikes around weekends and discretionary categories. High volatility signals impulsive behavior.",
        "traits": ["High weekend bias", "High volatility", "Uneven spending rhythm"],
    },
    "The Stable Builder": {
        "description": "Balanced financial profile with moderate diversification and controlled debt. Building toward financial maturity.",
        "traits": ["Balanced spending", "Low debt exposure", "Diversified categories"],
    },
}


def _classify_behavioral_persona(
    volatility: Dict[str, Any],
    burden: Dict[str, Any],
    concentration: Dict[str, Any],
    drift: Dict[str, Any],
    weekend: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Rule-based persona classification using Phase 1 metric outputs.

    Scoring approach:
      Each persona accumulates affinity points from relevant signals.
      The persona with the highest affinity wins.
      Confidence = winner_score / total_score.
    """
    vol_score = volatility.get("volatility_score", 0)
    burden_ratio = burden.get("burden_ratio", 0)
    hhi = concentration.get("concentration_score", 0)
    drift_count = drift.get("drift_count", 0)
    weekend_ratio = weekend.get("weekend_ratio", 0)
    weekend_pattern = weekend.get("pattern", "Balanced")

    scores: Dict[str, float] = {
        "The Optimizer": 0,
        "The Drifter": 0,
        "The Subscribed": 0,
        "The Impulsive": 0,
        "The Stable Builder": 0,
    }

    # ── The Optimizer: low volatility + low burden ──
    if vol_score < 30:
        scores["The Optimizer"] += 3.0
    elif vol_score < 50:
        scores["The Optimizer"] += 1.5
    if burden_ratio < 0.2:
        scores["The Optimizer"] += 2.5
    elif burden_ratio < 0.35:
        scores["The Optimizer"] += 1.0
    if drift_count == 0:
        scores["The Optimizer"] += 1.5

    # ── The Drifter: high drift + rising lifestyle ──
    if drift_count >= 3:
        scores["The Drifter"] += 4.0
    elif drift_count >= 2:
        scores["The Drifter"] += 2.5
    elif drift_count >= 1:
        scores["The Drifter"] += 1.5
    if hhi > 0.4:
        scores["The Drifter"] += 1.5  # concentrated = shifting toward specific areas
    if vol_score >= 40:
        scores["The Drifter"] += 1.0

    # ── The Subscribed: high recurring burden ──
    if burden_ratio > 0.5:
        scores["The Subscribed"] += 4.5
    elif burden_ratio > 0.35:
        scores["The Subscribed"] += 3.0
    elif burden_ratio > 0.25:
        scores["The Subscribed"] += 1.5
    if hhi > 0.3:
        scores["The Subscribed"] += 1.0  # likely entertainment-heavy subs

    # ── The Impulsive: high weekend + high volatility ──
    if weekend_pattern == "Leisure-skewed":
        scores["The Impulsive"] += 3.5
    elif weekend_ratio > 0.32:
        scores["The Impulsive"] += 1.5
    if vol_score >= 60:
        scores["The Impulsive"] += 3.0
    elif vol_score >= 40:
        scores["The Impulsive"] += 1.5
    if drift_count >= 1:
        scores["The Impulsive"] += 0.5

    # ── The Stable Builder: balanced + low debt ──
    if vol_score < 40 and burden_ratio < 0.35:
        scores["The Stable Builder"] += 2.5
    if weekend_pattern == "Balanced":
        scores["The Stable Builder"] += 2.0
    if hhi < 0.35:
        scores["The Stable Builder"] += 2.0
    if drift_count <= 1:
        scores["The Stable Builder"] += 1.5

    # ── Resolve winner ──
    total = sum(scores.values()) or 1
    winner = max(scores, key=scores.get)  # type: ignore
    confidence = round(scores[winner] / total, 2)

    # If confidence is very low, fall back to Stable Builder
    if confidence < 0.20:
        winner = "The Stable Builder"
        confidence = 0.20

    persona_def = PERSONA_DEFINITIONS.get(winner, {})

    # Determine primary + secondary risk areas from top signals
    risk_areas = _determine_risk_areas(vol_score, burden_ratio, drift_count, weekend_ratio, hhi)

    return {
        "persona": winner,
        "confidence": confidence,
        "description": persona_def.get("description", ""),
        "traits": persona_def.get("traits", []),
        "primary_risk_area": risk_areas[0] if risk_areas else "None detected",
        "secondary_risk_area": risk_areas[1] if len(risk_areas) > 1 else "None detected",
        "affinity_scores": {k: round(v, 2) for k, v in scores.items()},
    }


def _determine_risk_areas(
    vol_score: float,
    burden_ratio: float,
    drift_count: int,
    weekend_ratio: float,
    hhi: float,
) -> List[str]:
    """Rank risk areas by severity for the persona output."""
    risks: List[tuple] = []

    if vol_score >= 50:
        risks.append(("Spend Volatility", vol_score))
    if burden_ratio > 0.35:
        risks.append(("Subscription Burden", burden_ratio * 100))
    if drift_count >= 2:
        risks.append(("Lifestyle Drift", drift_count * 25))
    if weekend_ratio > 0.35:
        risks.append(("Weekend Impulse Spending", weekend_ratio * 100))
    if hhi > 0.4:
        risks.append(("Category Overexposure", hhi * 100))

    # Sort by severity descending
    risks.sort(key=lambda x: x[1], reverse=True)
    return [r[0] for r in risks] if risks else ["No significant risks"]


# ─── Full Intelligence Report (Phase 1 + Phase 2) ──────────────────────────

def compute_full_intelligence(
    subscriptions: List[Any],
    expenses: List[Any],
) -> Dict[str, Any]:
    """
    Run the complete behavior intelligence stack:
    Phase 1 (descriptive) + Phase 2 (predictive + composite).
    """
    phase1 = compute_behavior_metrics(subscriptions, expenses)
    phase2 = compute_advanced_behavior_signals(subscriptions, expenses)
    return {**phase1, **phase2}
