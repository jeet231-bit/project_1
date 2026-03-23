from fastapi import APIRouter, Depends, Body
from typing import List, Dict, Any
from ..dependencies import get_db, get_current_user
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/recommend")
def recommend_actions(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Analyze user's financial data and auto-generate 2-3 recommended actions.
    Called when the Action tab loads so it's never empty after onboarding.
    """
    user_id = user.user.id
    actions: List[Dict[str, Any]] = []

    try:
        # ── Fetch user data ──────────────────────────────────────────
        subs_resp = db.table("subscriptions").select("*").eq("user_id", user_id).eq("status", "active").execute()
        subs = subs_resp.data or []

        exp_resp = db.table("expenses").select("*").eq("user_id", user_id).execute()
        expenses = exp_resp.data or []

        income_resp = db.table("income").select("*").eq("user_id", user_id).execute()
        income_rows = income_resp.data or []

        total_income = sum(r.get("amount", 0) for r in income_rows)
        total_sub_spend = sum(s.get("amount", 0) for s in subs)
        total_expense_spend = sum(e.get("amount", 0) for e in expenses)

        # ── 1. High-cost subscription → suggest cancel or switch ─────
        if subs:
            # Sort by amount descending, pick the costliest
            sorted_subs = sorted(subs, key=lambda s: s.get("amount", 0), reverse=True)
            costliest = sorted_subs[0]
            cost = costliest.get("amount", 0)
            sub_id = costliest.get("id")
            sub_name = costliest.get("name", "Unknown")
            cycle = costliest.get("billing_cycle", "monthly")

            if cycle == "monthly" and cost >= 200:
                # Suggest switching to yearly
                yearly_savings = round(cost * 12 * 0.15)  # ~15% savings
                actions.append({
                    "type": "switch_plan",
                    "label": f"Switch {sub_name} to yearly — save ~₹{yearly_savings:,}/yr",
                    "metadata": {"subscription_id": str(sub_id), "new_cycle": "yearly"},
                })
            elif cost >= 500:
                actions.append({
                    "type": "cancel_subscription",
                    "label": f"Review {sub_name} (₹{cost:,}/mo) — your costliest subscription",
                    "metadata": {"subscription_id": str(sub_id)},
                })

        # ── 2. Category overspend → suggest budget reduction ─────────
        if expenses:
            category_spend: Dict[str, float] = {}
            for e in expenses:
                cat = e.get("category", "Other")
                category_spend[cat] = category_spend.get(cat, 0) + e.get("amount", 0)

            if category_spend:
                top_cat = max(category_spend, key=lambda k: category_spend[k])
                top_spend = category_spend[top_cat]
                suggested_limit = round(top_spend * 0.8 / 100) * 100  # 20% reduction, rounded

                if top_spend > 0 and suggested_limit > 0:
                    actions.append({
                        "type": "reduce_budget",
                        "label": f"Set {top_cat} budget to ₹{suggested_limit:,} (20% trim from ₹{round(top_spend):,})",
                        "metadata": {"category": top_cat, "new_limit": suggested_limit},
                    })

        # ── 3. Surplus allocation → suggest investing freed capital ───
        if total_income > 0:
            total_outflow = total_sub_spend + total_expense_spend
            surplus = total_income - total_outflow
            if surplus > 0:
                invest_amount = round(surplus * 0.3 / 100) * 100  # 30% of surplus
                if invest_amount >= 500:
                    actions.append({
                        "type": "invest_freed_capital",
                        "label": f"Allocate ₹{invest_amount:,}/mo from surplus to investments",
                        "metadata": {"amount": invest_amount, "source": "monthly_surplus"},
                    })
            elif surplus < 0:
                # Overspending — suggest a commitment
                actions.append({
                    "type": "set_commitment",
                    "label": f"Set a daily spending cap — you're ₹{abs(round(surplus)):,} over income",
                    "metadata": {"daily_limit": round(total_income / 30)},
                })

        # ── 4. Low-value subscription (cheapest + entertainment) ─────
        if len(subs) >= 3 and len(actions) < 3:
            entertainment_subs = [s for s in subs if s.get("category", "").lower() in ("entertainment", "music", "gaming")]
            if entertainment_subs:
                cheapest_ent = min(entertainment_subs, key=lambda s: s.get("amount", 0))
                actions.append({
                    "type": "cancel_subscription",
                    "label": f"Cancel {cheapest_ent.get('name', 'subscription')} — low-utility entertainment (₹{cheapest_ent.get('amount', 0):,}/mo)",
                    "metadata": {"subscription_id": str(cheapest_ent.get("id"))},
                })

    except Exception as e:
        print(f"[ACTIONS] Recommend error: {e}")
        import traceback
        traceback.print_exc()

    # Return at most 3 actions
    return {"status": "ok", "actions": [actions[i] for i in range(min(3, len(actions)))]}


@router.post("/execute")
async def execute_actions(
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Execute one or more Lex-recommended actions.
    Payload:
    {
        "actions": [
            { "type": "cancel_subscription", "label": "Cancel Netflix", "metadata": { "subscription_id": "123" } },
            { "type": "reduce_budget",       "label": "Lower dining budget", "metadata": { "category": "Food", "new_limit": 3000 } },
            { "type": "switch_plan",         "label": "Switch Netflix to yearly", "metadata": { "subscription_id": "1", "new_cycle": "yearly" } }
        ]
    }
    """
    actions: List[Dict[str, Any]] = payload.get("actions", [])
    results: List[Dict[str, Any]] = []
    user_id = user.user.id

    for action in actions:
        action_type = action.get("type", "")
        label = action.get("label", "Unknown action")
        meta = action.get("metadata", {})

        try:
            if action_type == "cancel_subscription":
                sub_id = meta.get("subscription_id")
                if not sub_id:
                    results.append({"label": label, "status": "failed", "reason": "Missing subscription_id"})
                    continue

                # Update subscription status → cancelled
                response = (
                    db.table("subscriptions")
                    .update({"status": "cancelled"})
                    .eq("id", sub_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if response.data:
                    results.append({"label": label, "status": "success", "detail": f"Subscription {sub_id} cancelled."})
                else:
                    results.append({"label": label, "status": "failed", "reason": "Subscription not found or not owned by user."})

            elif action_type == "reduce_budget":
                category = meta.get("category")
                new_limit = meta.get("new_limit")
                if not category or new_limit is None:
                    results.append({"label": label, "status": "failed", "reason": "Missing category or new_limit"})
                    continue

                response = (
                    db.table("category_budgets")
                    .upsert(
                        {
                            "user_id": user_id,
                            "category": category,
                            "monthly_limit": float(new_limit),
                        },
                        on_conflict="user_id,category",
                    )
                    .execute()
                )
                if response.data:
                    results.append({
                        "label": label,
                        "status": "success",
                        "detail": f"Budget for '{category}' set to ₹{new_limit}.",
                    })
                else:
                    results.append({
                        "label": label,
                        "status": "failed",
                        "reason": "Failed to save category budget.",
                    })

            elif action_type == "switch_plan":
                sub_id = meta.get("subscription_id")
                new_cycle = meta.get("new_cycle", "yearly")
                if not sub_id:
                    results.append({"label": label, "status": "failed", "reason": "Missing subscription_id"})
                    continue

                response = (
                    db.table("subscriptions")
                    .update({"billing_cycle": new_cycle})
                    .eq("id", sub_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if response.data:
                    results.append({"label": label, "status": "success", "detail": f"Switched subscription {sub_id} to {new_cycle}."})
                else:
                    results.append({"label": label, "status": "failed", "reason": "Subscription not found."})

            else:
                results.append({"label": label, "status": "skipped", "reason": f"Unknown action type: {action_type}"})

        except Exception as e:
            results.append({"label": label, "status": "error", "reason": str(e)})

    succeeded = sum(1 for r in results if r["status"] == "success")
    failed = len(results) - succeeded

    return {
        "summary": f"{succeeded} action(s) executed successfully, {failed} failed or skipped.",
        "results": results,
    }
