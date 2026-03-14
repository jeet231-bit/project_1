"""
Proactive Intelligence — Behavior Change Detector
===================================================

Phase 4: Makes the system proactive rather than reactive.

Compares the latest maturity snapshot against the previous one,
computes deltas across key behavioral metrics, and generates
structured alerts when thresholds are crossed.

Also includes a Maturity Forecasting Engine that uses linear
regression on the last 5 snapshots to predict future trajectory.

Alert Types:
  - maturity_drop        — Maturity score fell significantly
  - maturity_surge       — Maturity score improved significantly
  - burden_spike         — Subscription burden crossed danger zone
  - volatility_surge     — Spending volatility spiked
  - persona_shift        — Behavioral persona changed
  - drift_increase       — Lifestyle drift accelerated
  - maturity_forecast    — Projected maturity trajectory alert
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta


# ─── Threshold Configuration ────────────────────────────────────────────────

THRESHOLDS = {
    "maturity_drop": {
        "field": "delta_maturity",
        "condition": "lt",       # less than
        "value": -5,
        "severity": "critical",
        "title": "Maturity Score Declining",
        "message_template": "Your financial maturity dropped by {delta} points (from {old} to {new}). This indicates regression in financial discipline.",
        "suggested_action": "Review recent spending patterns and subscription commitments",
        "suggested_action_type": "review_spending",
    },
    "maturity_surge": {
        "field": "delta_maturity",
        "condition": "gt",       # greater than
        "value": 5,
        "severity": "info",
        "title": "Maturity Score Improving",
        "message_template": "Your financial maturity improved by {delta} points (from {old} to {new}). Keep up the disciplined behavior!",
        "suggested_action": "Consider increasing your savings target to accelerate growth",
        "suggested_action_type": "increase_savings",
    },
    "burden_spike": {
        "field": "delta_burden",
        "condition": "gt",
        "value": 0.10,          # burden ratio increased by 10%+
        "severity": "warning",
        "title": "Subscription Burden Increasing",
        "message_template": "Your subscription burden ratio increased by {delta:.0%} (now {new:.0%}). Recurring costs are consuming more of your income.",
        "suggested_action": "Audit your active subscriptions for low-usage services",
        "suggested_action_type": "cancel_subscription",
    },
    "burden_critical": {
        "field": "new_burden",
        "condition": "gt",
        "value": 0.40,          # absolute burden > 40%
        "severity": "critical",
        "title": "Subscription Burden Critical",
        "message_template": "Your subscription burden is at {new:.0%} — well above the healthy threshold of 30%. Immediate action recommended.",
        "suggested_action": "Cancel or downgrade at least 2 subscriptions to reduce recurring drain",
        "suggested_action_type": "cancel_subscription",
    },
    "volatility_surge": {
        "field": "delta_volatility",
        "condition": "gt",
        "value": 15,
        "severity": "warning",
        "title": "Spending Volatility Spike",
        "message_template": "Your spending volatility increased by {delta} points (now {new}). This suggests impulsive or irregular spending patterns.",
        "suggested_action": "Set category budgets to maintain spending discipline",
        "suggested_action_type": "reduce_budget",
    },
    "persona_shift": {
        "field": "persona_changed",
        "condition": "eq",
        "value": True,
        "severity": "warning",
        "title": "Behavioral Persona Changed",
        "message_template": "Your behavioral persona shifted from \"{old_persona}\" to \"{new_persona}\". This signals a significant change in your financial behavior patterns.",
        "suggested_action": "Review what changed in your spending and subscription habits",
        "suggested_action_type": "review_spending",
    },
    "drift_increase": {
        "field": "delta_drift_count",
        "condition": "gt",
        "value": 1,
        "severity": "warning",
        "title": "Lifestyle Drift Accelerating",
        "message_template": "Lifestyle drift categories increased by {delta} (now {new} categories drifting). Your spending is shifting into new areas.",
        "suggested_action": "Check if new spending categories align with your goals",
        "suggested_action_type": "review_spending",
    },
}


# ─── Delta Computation ──────────────────────────────────────────────────────

def compute_snapshot_deltas(
    current_snapshot: Dict[str, Any],
    previous_snapshot: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compare two maturity snapshots and compute behavioral deltas.
    
    Returns a dict with:
      - delta_maturity (int)
      - delta_volatility (float)
      - delta_burden (float)
      - delta_drift_count (int)
      - delta_concentration (float)
      - persona_changed (bool)
      - old_persona (str)
      - new_persona (str)
      - new_burden (float) — absolute current burden
      - new_volatility (float) — absolute current volatility
    """
    curr_behavior = current_snapshot.get("behavior_snapshot", {})
    prev_behavior = previous_snapshot.get("behavior_snapshot", {})

    curr_maturity = current_snapshot.get("maturity_score", 0)
    prev_maturity = previous_snapshot.get("maturity_score", 0)

    deltas = {
        "delta_maturity": curr_maturity - prev_maturity,
        "delta_volatility": (
            curr_behavior.get("volatility_score", 0) -
            prev_behavior.get("volatility_score", 0)
        ),
        "delta_burden": (
            curr_behavior.get("burden_ratio", 0) -
            prev_behavior.get("burden_ratio", 0)
        ),
        "delta_drift_count": (
            curr_behavior.get("drift_count", 0) -
            prev_behavior.get("drift_count", 0)
        ),
        "delta_concentration": (
            curr_behavior.get("concentration_hhi", 0) -
            prev_behavior.get("concentration_hhi", 0)
        ),
        "persona_changed": current_snapshot.get("persona_changed", False),
        "old_persona": previous_snapshot.get("persona", "Unknown"),
        "new_persona": current_snapshot.get("persona", "Unknown"),
        # Absolute current values (for threshold checks)
        "new_burden": curr_behavior.get("burden_ratio", 0),
        "new_volatility": curr_behavior.get("volatility_score", 0),
        "new_maturity": curr_maturity,
        "old_maturity": prev_maturity,
        "new_drift_count": curr_behavior.get("drift_count", 0),
    }
    return deltas


# ─── Alert Generation ───────────────────────────────────────────────────────

def _check_condition(value: Any, condition: str, threshold: Any) -> bool:
    """Evaluate a threshold condition."""
    if condition == "lt":
        return value < threshold
    elif condition == "gt":
        return value > threshold
    elif condition == "eq":
        return value == threshold
    elif condition == "gte":
        return value >= threshold
    elif condition == "lte":
        return value <= threshold
    return False


def generate_alerts(
    deltas: Dict[str, Any],
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Apply threshold rules to deltas and produce structured alert objects.
    
    Returns a list of alert dicts ready for DB insertion.
    """
    alerts: List[Dict[str, Any]] = []

    for alert_type, config in THRESHOLDS.items():
        field = config["field"]
        value = deltas.get(field)

        if value is None:
            continue

        if not _check_condition(value, config["condition"], config["value"]):
            continue

        # Format the message with actual values
        try:
            msg = config["message_template"].format(
                delta=abs(deltas.get(f"delta_{field.replace('delta_', '')}", value)),
                old=deltas.get(f"old_{field.replace('delta_', '').replace('new_', '')}", "?"),
                new=deltas.get(f"new_{field.replace('delta_', '')}", value),
                old_persona=deltas.get("old_persona", "Unknown"),
                new_persona=deltas.get("new_persona", "Unknown"),
            )
        except (KeyError, ValueError):
            msg = config["message_template"]

        alert = {
            "user_id": user_id,
            "alert_type": alert_type,
            "severity": config["severity"],
            "title": config["title"],
            "message": msg,
            "metric_deltas": {
                "delta_maturity": deltas.get("delta_maturity"),
                "delta_volatility": deltas.get("delta_volatility"),
                "delta_burden": deltas.get("delta_burden"),
                "delta_drift_count": deltas.get("delta_drift_count"),
                "persona_changed": deltas.get("persona_changed"),
            },
            "suggested_action": config["suggested_action"],
            "suggested_action_type": config["suggested_action_type"],
            "is_read": False,
            "is_dismissed": False,
        }
        alerts.append(alert)

    return alerts


# ─── Maturity Forecasting Engine ─────────────────────────────────────────────

def forecast_maturity(snapshots: List[Dict[str, Any]], periods_ahead: int = 3) -> Optional[Dict[str, Any]]:
    """
    Simple linear regression on the last N maturity snapshots to predict
    the future maturity trajectory.
    
    Args:
        snapshots: List of snapshot dicts, ordered newest-first.
                   Each must have 'maturity_score' and 'snapshot_at'.
        periods_ahead: How many periods (snapshot intervals) to project.
    
    Returns:
        Dict with forecast details, or None if insufficient data (<3 snapshots).
    """
    if len(snapshots) < 3:
        return None

    # Use up to 5 most recent snapshots (already ordered newest-first)
    recent = snapshots[:5]
    recent.reverse()  # oldest-first for regression

    scores = [s.get("maturity_score", 0) for s in recent]
    n = len(scores)

    # Simple linear regression: y = mx + b
    x_vals = list(range(n))
    x_mean = sum(x_vals) / n
    y_mean = sum(scores) / n

    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, scores))
    denominator = sum((x - x_mean) ** 2 for x in x_vals)

    if denominator == 0:
        return None

    slope = numerator / denominator
    intercept = y_mean - slope * x_mean

    # Predict future scores
    predictions = []
    for i in range(1, periods_ahead + 1):
        future_x = n - 1 + i
        predicted = slope * future_x + intercept
        predicted = max(0, min(100, predicted))  # clamp to 0-100
        predictions.append(round(predicted, 1))

    # Compute R² for confidence
    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(x_vals, scores))
    ss_tot = sum((y - y_mean) ** 2 for y in scores)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    # Determine trajectory
    if slope > 1:
        trajectory = "improving"
        trajectory_label = "Upward Trend"
    elif slope < -1:
        trajectory = "declining"
        trajectory_label = "Downward Trend"
    else:
        trajectory = "stable"
        trajectory_label = "Stable"

    return {
        "current_score": scores[-1],
        "slope": round(slope, 2),
        "intercept": round(intercept, 2),
        "r_squared": round(r_squared, 3),
        "confidence": "high" if r_squared > 0.7 else ("medium" if r_squared > 0.4 else "low"),
        "trajectory": trajectory,
        "trajectory_label": trajectory_label,
        "predictions": predictions,
        "periods_ahead": periods_ahead,
        "data_points_used": n,
        "historical_scores": scores,
    }


def generate_forecast_alert(
    forecast: Dict[str, Any],
    user_id: str
) -> Optional[Dict[str, Any]]:
    """
    Generate a proactive alert based on maturity forecast if the trajectory
    is notably positive or negative.
    """
    if not forecast or forecast.get("confidence") == "low":
        return None

    trajectory = forecast.get("trajectory")
    predictions = forecast.get("predictions", [])
    current = forecast.get("current_score", 0)
    slope = forecast.get("slope", 0)

    if trajectory == "declining" and predictions:
        projected = predictions[-1]
        return {
            "user_id": user_id,
            "alert_type": "maturity_forecast",
            "severity": "critical" if slope < -3 else "warning",
            "title": "Maturity Trajectory Declining",
            "message": (
                f"At the current rate, your maturity score is projected to reach "
                f"{projected} (from {current}) in {len(predictions)} periods. "
                f"Consider reversing negative trends now."
            ),
            "metric_deltas": {
                "slope": slope,
                "current_score": current,
                "projected_score": projected,
                "confidence": forecast.get("confidence"),
            },
            "suggested_action": "Focus on reducing subscription burden and controlling volatile spending",
            "suggested_action_type": "review_spending",
            "is_read": False,
            "is_dismissed": False,
        }
    elif trajectory == "improving" and predictions:
        projected = predictions[-1]
        return {
            "user_id": user_id,
            "alert_type": "maturity_forecast",
            "severity": "info",
            "title": "Maturity Trajectory Positive",
            "message": (
                f"Great progress! Your maturity score is projected to reach "
                f"{projected} (from {current}) in {len(predictions)} periods. "
                f"Your financial discipline is paying off."
            ),
            "metric_deltas": {
                "slope": slope,
                "current_score": current,
                "projected_score": projected,
                "confidence": forecast.get("confidence"),
            },
            "suggested_action": "Maintain current habits and consider deploying surplus capital",
            "suggested_action_type": "increase_savings",
            "is_read": False,
            "is_dismissed": False,
        }

    return None


# ─── Main Detector Orchestrator ─────────────────────────────────────────────

def detect_behavior_changes(user_id: str, db: Any) -> Dict[str, Any]:
    """
    Main entry point for the Proactive Intelligence Layer.
    
    1. Fetches the last 2+ maturity snapshots
    2. Computes deltas between latest and previous
    3. Generates threshold-based alerts
    4. Runs maturity forecasting on last 5 snapshots
    5. Persists new alerts to behavior_alerts table
    6. Returns all generated alerts + forecast
    
    Returns:
        {
            "alerts": [...],
            "forecast": {...},
            "deltas": {...},
            "status": "ok"
        }
    """
    try:
        # Fetch recent snapshots (need at least 2 for deltas)
        snapshots_result = (
            db.table("financial_maturity_history")
            .select("*")
            .eq("user_id", user_id)
            .order("snapshot_at", desc=True)
            .limit(5)
            .execute()
        )

        snapshots = snapshots_result.data or []

        if len(snapshots) < 2:
            return {
                "status": "insufficient_data",
                "alerts": [],
                "forecast": None,
                "deltas": None,
                "message": "Need at least 2 maturity snapshots to detect changes.",
            }

        # ── Compute Deltas ──
        current = snapshots[0]   # most recent
        previous = snapshots[1]  # prior snapshot
        deltas = compute_snapshot_deltas(current, previous)

        # ── Generate Threshold Alerts ──
        alerts = generate_alerts(deltas, user_id)

        # ── Maturity Forecast ──
        forecast = forecast_maturity(snapshots)
        if forecast:
            forecast_alert = generate_forecast_alert(forecast, user_id)
            if forecast_alert:
                alerts.append(forecast_alert)

        # ── Deduplicate against recent alerts ──
        # Don't create duplicate alerts within the last 24 hours
        try:
            recent_alerts_result = (
                db.table("behavior_alerts")
                .select("alert_type, created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(20)
                .execute()
            )
            recent_types = set()
            if recent_alerts_result.data:
                cutoff = datetime.utcnow() - timedelta(hours=23)
                for a in recent_alerts_result.data:
                    try:
                        ts = datetime.fromisoformat(
                            a.get("created_at", "").replace("Z", "+00:00")
                        ).replace(tzinfo=None)
                        if ts > cutoff:
                            recent_types.add(a.get("alert_type"))
                    except Exception:
                        pass

            # Filter out already-generated alert types
            new_alerts = [a for a in alerts if a["alert_type"] not in recent_types]
        except Exception as dedup_err:
            print(f"[PROACTIVE] Dedup check failed (table may not exist): {dedup_err}")
            new_alerts = alerts

        # ── Persist New Alerts ──
        persisted_count = 0
        for alert in new_alerts:
            try:
                db.table("behavior_alerts").insert(alert).execute()
                persisted_count += 1
            except Exception as insert_err:
                print(f"[PROACTIVE] Alert insert failed: {insert_err}")

        if persisted_count > 0:
            print(f"[PROACTIVE] Generated {persisted_count} new alert(s) for user {user_id}")

        return {
            "status": "ok",
            "alerts": new_alerts,
            "all_alerts_count": len(alerts),
            "persisted_count": persisted_count,
            "forecast": forecast,
            "deltas": deltas,
        }

    except Exception as e:
        import traceback
        print(f"[PROACTIVE] Error: {e}\n{traceback.format_exc()}")
        return {
            "status": "error",
            "alerts": [],
            "forecast": None,
            "deltas": None,
            "error": str(e),
        }


def get_active_alerts(user_id: str, db: Any, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Fetch unread/active alerts for a user, ordered by most recent.
    """
    try:
        result = (
            db.table("behavior_alerts")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_dismissed", False)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[PROACTIVE] Fetch alerts failed (table may not exist): {e}")
        return []
