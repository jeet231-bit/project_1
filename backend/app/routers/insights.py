from fastapi import APIRouter, Depends, Body
from ..models import Insight
from typing import List, Dict, Any
from ..dependencies import get_db, get_current_user
from ..lex import reduce_financial_context, process_lex_query, compute_data_coverage, LexMode
from ..behavior_engine import compute_behavior_metrics, compute_advanced_behavior_signals, compute_full_intelligence
from ..behavior_classifier import classify_behavior_profile, should_reclassify
from ..behavior_change_detector import detect_behavior_changes, get_active_alerts, forecast_maturity
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/", response_model=List[Insight])
def get_insights(user = Depends(get_current_user), db = Depends(get_db)):
    # Placeholder for standard AI insights
    return []


@router.get("/behavior")
def get_behavior_metrics(user = Depends(get_current_user), db = Depends(get_db)):
    """Return computed behavior intelligence metrics for the current user."""
    try:
        user_id = user.user.id
        subs_response = db.table("subscriptions").select("*").eq("user_id", user_id).execute()
        expenses_response = db.table("expenses").select("*").eq("user_id", user_id).execute()

        class MockObj:
            def __init__(self, d): self.__dict__ = d

        clean_subs = [MockObj({
            "name": s.get("name"), "amount": s.get("amount", 0),
            "billing_cycle": s.get("billing_cycle", "monthly").lower(),
            "category": s.get("category", "General"),
            "status": s.get("status", "active"),
            "created_at": s.get("created_at"),
        }) for s in subs_response.data]

        clean_expenses = [MockObj({
            "name": e.get("name"), "amount": e.get("amount", 0),
            "category": e.get("category", "General"),
            "date": e.get("date"),
        }) for e in expenses_response.data]

        phase1 = compute_behavior_metrics(clean_subs, clean_expenses)
        phase2 = compute_advanced_behavior_signals(clean_subs, clean_expenses)
        metrics = {**phase1, **phase2}

        # ── Hybrid LLM Classification Layer ──
        # Only call OpenAI classifier when we have sufficient data
        llm_classification = None
        data_score = 25 * (1 if len(clean_expenses) > 0 else 0) + 25 * (1 if len(clean_subs) > 0 else 0) + 50 * (1 if len(clean_expenses) >= 5 else 0)
        try:
            # Check cache in lex_conversations table
            cached = db.table("lex_conversations").select("behavior_persona, maturity_label, last_behavior_analysis").eq("user_id", user_id).order("updated_at", desc=True).limit(1).execute()
            last_ts = None
            if cached.data and cached.data[0].get("last_behavior_analysis"):
                last_ts = cached.data[0]["last_behavior_analysis"]
                # Return cached if still fresh
                if not should_reclassify(last_ts, data_score):
                    llm_classification = {
                        "persona": cached.data[0].get("behavior_persona"),
                        "maturity_label": cached.data[0].get("maturity_label"),
                        "_cached": True,
                    }

            if not llm_classification and should_reclassify(last_ts, data_score):
                llm_classification = classify_behavior_profile(metrics)
                # Cache result
                try:
                    if cached.data:
                        db.table("lex_conversations").update({
                            "behavior_persona": llm_classification.get("persona"),
                            "maturity_label": llm_classification.get("maturity_label"),
                            "last_behavior_analysis": "now()",
                        }).eq("id", cached.data[0].get("id")).execute()
                except Exception as cache_err:
                    print(f"[BEHAVIOR] Cache write skipped: {cache_err}")
        except Exception as cls_err:
            print(f"[BEHAVIOR] Classification skipped: {cls_err}")

        return {
            "status": "ok",
            "metrics": metrics,
            "classification": llm_classification,
        }
    except Exception as e:
        return {"status": "error", "metrics": None, "classification": None, "error": str(e)}


@router.post("/lex/query")
async def query_lex(
    query_payload: Dict[str, Any] = Body(...), 
    user = Depends(get_current_user), 
    db = Depends(get_db)
):
    try:
        print(f"[LEX] Received query: {query_payload.get('query', '')}")
        user_query = query_payload.get("query", "")
        conversation_history = query_payload.get("conversation_history", None)
        conversation_id = query_payload.get("conversation_id", None)
        model_override = query_payload.get("model", None)
        
        user_id = user.user.id

        # ── Auto-create conversation if none provided ──────────────────
        if not conversation_id:
            try:
                title = user_query[:60] + ("…" if len(user_query) > 60 else "")
                convo_result = (
                    db.table("lex_conversations")
                    .insert({"user_id": user_id, "title": title, "model": model_override or "gpt-4o-mini"})
                    .execute()
                )
                if convo_result.data:
                    conversation_id = convo_result.data[0]["id"]
                    print(f"[LEX] Created conversation: {conversation_id}")
            except Exception as ce:
                print(f"[LEX] Conversation creation skipped (table may not exist): {ce}")
                conversation_id = None
        
        # ── 1. Fetch Raw Data ──────────────────────────────────────────
        print(f"[LEX] Fetching data for user: {user_id}")
        subs_response = db.table("subscriptions").select("*").eq("user_id", user_id).execute()
        expenses_response = db.table("expenses").select("*").eq("user_id", user_id).execute()
        
        print(f"[LEX] Found {len(subs_response.data)} subscriptions, {len(expenses_response.data)} expenses")
        
        class MockObj:
            def __init__(self, d): self.__dict__ = d
            
        clean_subs = []
        for s in subs_response.data:
            clean_subs.append(MockObj({
                "id": s.get("id"),
                "name": s.get("name"),
                "amount": s.get("amount", 0),
                "billing_cycle": s.get("billing_cycle", "monthly").lower(),
                "category": s.get("category", "General"),
                "status": s.get("status", "active"),
                "created_at": s.get("created_at"),
            }))

        clean_expenses = []
        for e in expenses_response.data:
            clean_expenses.append(MockObj({
                "name": e.get("name"),
                "amount": e.get("amount", 0),
                "category": e.get("category", "General"),
                "date": e.get("date"),
            }))

        # ── 2. Reduce Context ─────────────────────────────────────────
        print("[LEX] Reducing financial context...")
        context = reduce_financial_context(user_id, clean_subs, clean_expenses, db=db)
        
        # ── 3. Process via OpenAI (with model tier routing) ───────────
        print("[LEX] Calling OpenAI...")
        from fastapi.concurrency import run_in_threadpool
        response = await run_in_threadpool(
            process_lex_query, user_query, context, conversation_history, model_override
        )
        print(f"[LEX] Response generated: {response.get('text', '')[:50]}...")

        # ── 4. Persist messages to DB ─────────────────────────────────
        if conversation_id:
            try:
                meta = response.get("_meta", {})
                messages_to_save = [
                    {
                        "conversation_id": conversation_id,
                        "role": "user",
                        "content": user_query,
                    },
                    {
                        "conversation_id": conversation_id,
                        "role": "assistant",
                        "content": response.get("text", ""),
                        "model": meta.get("model"),
                        "tokens_used": meta.get("total_tokens"),
                    },
                ]
                db.table("lex_messages").insert(messages_to_save).execute()

                # Persist strategy_summary + touch updated_at
                update_fields = {"updated_at": "now()"}
                strat_summary = response.get("strategy_summary")
                if strat_summary:
                    update_fields["strategy_summary"] = strat_summary

                db.table("lex_conversations").update(
                    update_fields
                ).eq("id", conversation_id).execute()
                print(f"[LEX] Persisted 2 messages to conversation {conversation_id}")
                if strat_summary:
                    print(f"[LEX] Strategic memory updated: {strat_summary[:60]}...")
            except Exception as pe:
                print(f"[LEX] Message persistence skipped: {pe}")

        # Include conversation_id in response for frontend
        response["conversation_id"] = conversation_id
        
        return response
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[LEX] CRITICAL ERROR: {str(e)}\n{error_trace}")
        return {
            "text": f"Intelligence Engine encountered a database or runtime error: {str(e)}",
            "routing": {"target_tab": "home", "should_navigate": False},
            "actions": [],
            "conversation_id": None,
            "error_details": str(e)
        }


# =========================================================================
# Maturity History + Persona Evolution (Phase 3)
# =========================================================================

@router.get("/maturity-history")
def get_maturity_history(user=Depends(get_current_user), db=Depends(get_db)):
    """Return the user's financial maturity score + persona history."""
    try:
        user_id = user.user.id
        result = (
            db.table("financial_maturity_history")
            .select("*")
            .eq("user_id", user_id)
            .order("snapshot_at", desc=True)
            .limit(30)
            .execute()
        )
        return {"status": "ok", "history": result.data or []}
    except Exception as e:
        return {"status": "error", "history": [], "error": str(e)}


@router.post("/maturity-snapshot")
def take_maturity_snapshot(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Compute current maturity + persona and persist a snapshot.
    Also detects persona evolution vs the last snapshot.
    Returns the snapshot record + evolution info.
    """
    try:
        user_id = user.user.id

        # ── Fetch raw data ──
        subs_response = db.table("subscriptions").select("*").eq("user_id", user_id).execute()
        expenses_response = db.table("expenses").select("*").eq("user_id", user_id).execute()

        class MockObj:
            def __init__(self, d): self.__dict__ = d

        clean_subs = [MockObj({
            "name": s.get("name"), "amount": s.get("amount", 0),
            "billing_cycle": s.get("billing_cycle", "monthly").lower(),
            "category": s.get("category", "General"),
            "status": s.get("status", "active"),
            "created_at": s.get("created_at"),
        }) for s in subs_response.data]

        clean_expenses = [MockObj({
            "name": e.get("name"), "amount": e.get("amount", 0),
            "category": e.get("category", "General"),
            "date": e.get("date"),
        }) for e in expenses_response.data]

        # ── Compute metrics ──
        phase1 = compute_behavior_metrics(clean_subs, clean_expenses)
        phase2 = compute_advanced_behavior_signals(clean_subs, clean_expenses)
        metrics = {**phase1, **phase2}

        maturity = metrics.get("financial_maturity", {})
        persona_data = metrics.get("behavioral_persona", {})

        maturity_score = maturity.get("maturity_index", 0)
        classification = maturity.get("classification", "Unknown")
        persona = persona_data.get("persona", "Unknown")
        persona_confidence = persona_data.get("confidence", 0.5)
        components = maturity.get("components", {})

        # Build a lean behavior snapshot
        behavior_snapshot = {
            "volatility_score": phase1.get("spend_volatility", {}).get("volatility_score", 0),
            "burden_ratio": phase1.get("subscription_burden", {}).get("burden_ratio", 0),
            "concentration_hhi": phase1.get("category_concentration", {}).get("concentration_score", 0),
            "weekend_ratio": phase1.get("weekend_bias", {}).get("weekend_ratio", 0),
            "drift_count": phase2.get("lifestyle_drift", {}).get("drift_count", 0),
        }

        # ── Get last snapshot for persona evolution ──
        last_snap = (
            db.table("financial_maturity_history")
            .select("persona, maturity_score, snapshot_at")
            .eq("user_id", user_id)
            .order("snapshot_at", desc=True)
            .limit(1)
            .execute()
        )

        previous_persona = None
        persona_changed = False
        if last_snap.data:
            previous_persona = last_snap.data[0].get("persona")
            if previous_persona and previous_persona != persona:
                persona_changed = True

        # ── Check if snapshot is too recent (throttle to 1 per day) ──
        skip_insert = False
        if last_snap.data:
            last_ts = last_snap.data[0].get("snapshot_at")
            if last_ts:
                try:
                    last_dt = datetime.fromisoformat(last_ts.replace("Z", "+00:00")).replace(tzinfo=None)
                    if (datetime.utcnow() - last_dt) < timedelta(hours=23):
                        skip_insert = True
                except Exception:
                    pass

        snapshot_record = {
            "user_id": user_id,
            "maturity_score": maturity_score,
            "classification": classification,
            "persona": persona,
            "persona_confidence": persona_confidence,
            "components": components,
            "behavior_snapshot": behavior_snapshot,
            "previous_persona": previous_persona,
            "persona_changed": persona_changed,
        }

        if not skip_insert:
            try:
                db.table("financial_maturity_history").insert(snapshot_record).execute()
                print(f"[MATURITY] Snapshot saved for user {user_id}: score={maturity_score}, persona={persona}")
            except Exception as insert_err:
                print(f"[MATURITY] Snapshot insert failed (table may not exist): {insert_err}")

        return {
            "status": "ok",
            "snapshot": snapshot_record,
            "persona_evolution": {
                "current_persona": persona,
                "previous_persona": previous_persona,
                "persona_changed": persona_changed,
                "maturity_score": maturity_score,
                "classification": classification,
            },
        }

    except Exception as e:
        import traceback
        print(f"[MATURITY] Error: {e}\n{traceback.format_exc()}")
        return {"status": "error", "snapshot": None, "persona_evolution": None, "error": str(e)}


# =========================================================================
# Proactive Intelligence — Behavior Alerts (Phase 4)
# =========================================================================

@router.post("/alerts/check")
def check_behavior_alerts(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Run the behavior change detector: compares latest snapshots,
    computes deltas, generates + persists alerts, and returns them
    along with the maturity forecast.
    """
    try:
        user_id = user.user.id
        result = detect_behavior_changes(user_id, db)
        return result
    except Exception as e:
        import traceback
        print(f"[PROACTIVE] Check alerts error: {e}\n{traceback.format_exc()}")
        return {"status": "error", "alerts": [], "forecast": None, "error": str(e)}


@router.get("/alerts")
def get_alerts(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Fetch active (unread/not-dismissed) alerts for the current user.
    """
    try:
        user_id = user.user.id
        alerts = get_active_alerts(user_id, db)
        return {"status": "ok", "alerts": alerts}
    except Exception as e:
        return {"status": "error", "alerts": [], "error": str(e)}


@router.put("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    """Mark a single alert as read."""
    try:
        user_id = user.user.id
        db.table("behavior_alerts").update(
            {"is_read": True}
        ).eq("id", alert_id).eq("user_id", user_id).execute()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.put("/alerts/{alert_id}/dismiss")
def dismiss_alert(alert_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    """Dismiss a single alert (hides it permanently)."""
    try:
        user_id = user.user.id
        db.table("behavior_alerts").update(
            {"is_dismissed": True, "is_read": True}
        ).eq("id", alert_id).eq("user_id", user_id).execute()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/forecast")
def get_maturity_forecast(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Return maturity trajectory forecast based on last 5 snapshots
    using linear regression.
    """
    try:
        user_id = user.user.id
        snapshots_result = (
            db.table("financial_maturity_history")
            .select("*")
            .eq("user_id", user_id)
            .order("snapshot_at", desc=True)
            .limit(5)
            .execute()
        )
        snapshots = snapshots_result.data or []
        forecast = forecast_maturity(snapshots)

        if not forecast:
            return {
                "status": "insufficient_data",
                "forecast": None,
                "message": "Need at least 3 maturity snapshots for forecasting.",
            }

        return {"status": "ok", "forecast": forecast}
    except Exception as e:
        return {"status": "error", "forecast": None, "error": str(e)}

