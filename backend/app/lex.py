from typing import List, Dict, Any, Optional
from .models import Subscription, Expense
from .openai_client import generate_lex_response, select_model_tier
from .behavior_engine import compute_behavior_metrics, compute_advanced_behavior_signals
from .behavior_classifier import classify_behavior_profile, should_reclassify
from .behavior_change_detector import get_active_alerts
from .surplus_engine import calculate_monthly_surplus
from .capital_allocation_engine import get_allocation_recommendation
from .trajectory_engine import forecast_capital_trajectory, compute_discipline_score
import json
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# Layer 0: Data Maturity Scoring & Activation Intelligence
# ---------------------------------------------------------------------------

class LexMode:
    ACTIVATION = "activation"   # No data — guided onboarding
    ANALYSIS   = "analysis"     # Moderate data — Tier 1 model
    STRATEGIC  = "strategic"    # Rich history — Tier 2 deep model


def compute_data_coverage(subscriptions: List[Any], expenses: List[Any]) -> Dict[str, Any]:
    """
    Score how much data coverage the user has.
    Returns a dict with individual flags, a 0-100 score, and resolved Lex mode.
    """
    has_expenses      = len(expenses) > 0
    has_subscriptions  = len([s for s in subscriptions if getattr(s, 'status', 'active') == 'active']) > 0

    # Check for 90-day history depth (expenses with date field)
    has_90_day_history = False
    try:
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        for e in expenses:
            d = getattr(e, 'date', None)
            if d:
                if isinstance(d, str):
                    d = datetime.fromisoformat(d.replace("Z", "+00:00")).replace(tzinfo=None)
                if d <= ninety_days_ago:
                    has_90_day_history = True
                    break
    except Exception:
        pass

    has_category_diversity = len(set(getattr(e, 'category', 'General') for e in expenses)) >= 3

    # Weighted score (0-100)
    score = (
        (25 if has_expenses else 0) +
        (25 if has_subscriptions else 0) +
        (25 if has_90_day_history else 0) +
        (25 if has_category_diversity else 0)
    )

    # Resolve mode
    if score == 0:
        mode = LexMode.ACTIVATION
    elif score >= 75:
        mode = LexMode.STRATEGIC
    else:
        mode = LexMode.ANALYSIS

    return {
        "score": score,
        "mode": mode,
        "flags": {
            "has_expenses": has_expenses,
            "has_subscriptions": has_subscriptions,
            "has_90_day_history": has_90_day_history,
            "has_category_diversity": has_category_diversity,
        },
    }


# ── Activation Mode response templates ─────────────────────────────────────

ACTIVATION_RESPONSES = {
    "default": {
        "text": (
            "Welcome to your financial command center. I don't see any spending "
            "or subscriptions yet — let's activate your financial visibility.\n\n"
            "Start by logging 3 recent expenses or adding at least one recurring "
            "subscription. That alone will unlock behavioral analysis, optimization "
            "insights, and spending intelligence."
        ),
        "suggestion": "Add your first expense",
        "routing": {"target_tab": "spending", "should_navigate": True},
        "actions": [
            {"type": "guided_setup", "label": "Start quick onboarding", "metadata": {}}
        ],
    },
    "money": {
        "text": (
            "I can't map where your money is going yet because there's nothing "
            "to map. Add a few expenses and I'll instantly show you category "
            "breakdowns, velocity trends, and hidden spending patterns."
        ),
        "suggestion": "Log your first expense",
        "routing": {"target_tab": "spending", "should_navigate": True},
        "actions": [],
    },
    "subscriptions": {
        "text": (
            "No recurring subscriptions on file yet. Add services like Netflix, "
            "Spotify, or your gym membership and I'll track renewal dates, "
            "calculate true monthly cost, and flag underused commitments."
        ),
        "suggestion": "Add a subscription",
        "routing": {"target_tab": "commitment", "should_navigate": True},
        "actions": [],
    },
    "behavior": {
        "text": (
            "Behavioral analysis needs at least a few weeks of spending data to "
            "identify patterns. Start logging expenses today and within 7 days "
            "I'll surface impulse triggers, lifestyle drift signals, and habit scores."
        ),
        "suggestion": "Start tracking now",
        "routing": {"target_tab": "spending", "should_navigate": True},
        "actions": [],
    },
}

# Keywords → activation template key
_ACTIVATION_INTENT_MAP = {
    "money":        ["money", "spend", "expense", "where", "going", "cost", "budget"],
    "subscriptions": ["subscription", "recurring", "netflix", "spotify", "service", "plan"],
    "behavior":     ["behavior", "habit", "pattern", "impulse", "lifestyle", "drift"],
}


def _pick_activation_template(query: str) -> Dict[str, Any]:
    """Choose the most relevant activation response for the user's query."""
    q = query.lower()
    for key, keywords in _ACTIVATION_INTENT_MAP.items():
        if any(kw in q for kw in keywords):
            return {**ACTIVATION_RESPONSES[key]}
    return {**ACTIVATION_RESPONSES["default"]}


# ---------------------------------------------------------------------------
# Layer 1: Financial Reducer
# ---------------------------------------------------------------------------

def reduce_financial_context(
    user_id: str,
    subscriptions: List[Any],
    expenses: List[Any],
    db: Any = None,
) -> Dict[str, Any]:
    """Compress raw subscription + expense rows into a compact context dict."""

    monthly_sub_spend = sum(
        s.amount if s.billing_cycle == 'monthly' else s.amount / 12
        for s in subscriptions if s.status == 'active'
    )

    coverage = compute_data_coverage(subscriptions, expenses)

    # Compute behavioral intelligence signals (Phase 1 + Phase 2)
    behavior = compute_behavior_metrics(subscriptions, expenses)
    advanced = compute_advanced_behavior_signals(subscriptions, expenses)

    # Hybrid LLM classification — only when sufficient data exists
    combined_metrics = {**behavior, **advanced}
    behavior_profile = None
    data_score = coverage.get("score", 0)
    if data_score >= 50:
        try:
            behavior_profile = classify_behavior_profile(combined_metrics)
        except Exception as cls_err:
            print(f"[LEX] Behavior classification skipped: {cls_err}")

    # Proactive Intelligence — inject recent alerts into context (Phase 4)
    proactive_alerts = []
    if db:
        try:
            raw_alerts = get_active_alerts(user_id, db, limit=5)
            proactive_alerts = [
                {
                    "type": a.get("alert_type"),
                    "severity": a.get("severity"),
                    "title": a.get("title"),
                    "message": a.get("message"),
                    "suggested_action": a.get("suggested_action"),
                }
                for a in raw_alerts
            ]
        except Exception as alert_err:
            print(f"[LEX] Proactive alerts injection skipped: {alert_err}")

    # ── Capital Discipline Engine — surplus, allocation, trajectory (Layer 7) ──
    capital_intelligence = None
    if db:
        try:
            class IncObj:
                def __init__(self, d): self.__dict__ = d

            income_resp = db.table("income").select("*").eq("user_id", user_id).execute()
            income_rows = [IncObj({
                "source": r.get("source", ""),
                "amount": r.get("amount", 0),
                "frequency": r.get("frequency", "monthly"),
                "is_active": r.get("is_active", True),
            }) for r in (income_resp.data or [])]

            commit_resp = db.table("fixed_commitments").select("*").eq("user_id", user_id).execute()
            commitments = [IncObj({
                "name": c.get("name", ""),
                "category": c.get("category", "General"),
                "amount": c.get("amount", 0),
                "frequency": c.get("frequency", "monthly"),
                "is_active": c.get("is_active", True),
            }) for c in (commit_resp.data or [])]

            if income_rows:
                surplus_data = calculate_monthly_surplus(income_rows, subscriptions, expenses, commitments)
                risk_scores = advanced.get("subscription_risk_scores", [])

                # Load allocation preferences
                prefs_resp = db.table("capital_allocation_preferences").select("*").eq("user_id", user_id).execute()
                prefs = prefs_resp.data[0] if prefs_resp.data else None

                allocation = get_allocation_recommendation(
                    surplus_amount=surplus_data["monthly_surplus"],
                    preferences=prefs,
                    subscriptions=subscriptions,
                    subscription_risk_scores=risk_scores,
                )

                trajectory = forecast_capital_trajectory(
                    monthly_income=surplus_data["monthly_income"],
                    monthly_expenses=surplus_data["monthly_expenses"],
                    monthly_subscriptions=surplus_data["monthly_subscriptions"],
                    reallocation_opportunities=allocation.get("reallocation_opportunities", []),
                    allocation_percentages=allocation.get("percentages", {}),
                )

                maturity_score = advanced.get("financial_maturity", {}).get("maturity_index", 50)
                persona_conf = advanced.get("behavioral_persona", {}).get("confidence", 0.5)
                discipline = compute_discipline_score(
                    burn_rate=surplus_data["burn_rate"],
                    surplus_classification=surplus_data["surplus_classification"],
                    persona_confidence=persona_conf,
                    maturity_score=maturity_score,
                )

                capital_intelligence = {
                    "surplus": surplus_data,
                    "allocation": allocation,
                    "trajectory": {
                        "current_path_5y": trajectory["current_path_5y"],
                        "disciplined_path_5y": trajectory["disciplined_path_5y"],
                        "delta_5y": trajectory["delta_5y"],
                        "current_path_10y": trajectory["current_path_10y"],
                        "disciplined_path_10y": trajectory["disciplined_path_10y"],
                        "delta_10y": trajectory["delta_10y"],
                        "discipline_savings_monthly": trajectory["discipline_savings_monthly"],
                    },
                    "discipline_score": discipline,
                }
                print(f"[LEX] Capital intelligence injected — surplus={surplus_data['monthly_surplus']}, discipline={discipline['discipline_score']}")
        except Exception as cap_err:
            print(f"[LEX] Capital intelligence injection skipped: {cap_err}")

    # ── Strategic Memory — load the latest strategy summary for continuity ──
    strategy_summary = None
    if db:
        try:
            summary_resp = (
                db.table("lex_conversations")
                .select("strategy_summary")
                .eq("user_id", user_id)
                .not_.is_("strategy_summary", "null")
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            if summary_resp.data and summary_resp.data[0].get("strategy_summary"):
                strategy_summary = summary_resp.data[0]["strategy_summary"]
                print(f"[LEX] Strategic memory loaded: {strategy_summary[:80]}...")
        except Exception as mem_err:
            print(f"[LEX] Strategic memory load skipped: {mem_err}")

    context = {
        "user_id": user_id,
        "data_coverage": coverage,
        "strategy_summary": strategy_summary,
        "metrics": {
            "total_monthly_subs": monthly_sub_spend,
            "active_subs_count": len([s for s in subscriptions if s.status == 'active']),
        },
        "behavior_metrics": behavior,
        "advanced_intelligence": advanced,
        "behavior_profile": behavior_profile,
        "proactive_alerts": proactive_alerts,
        "capital_intelligence": capital_intelligence,
        "subscriptions": [
            {
                "id": getattr(s, 'id', None),
                "name": s.name, "amount": s.amount,
                "cycle": s.billing_cycle, "category": s.category,
            }
            for s in subscriptions if s.status == 'active'
        ],
        "recent_expenses": [
            {"name": e.name, "amount": e.amount, "category": e.category}
            for e in expenses[-5:]  # Last 5 expenses
        ],
    }
    return context


# ---------------------------------------------------------------------------
# Layer 2: Lex Intelligence Engine (OpenAI)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Persona → Tone Directive Map (Phase 3: Adaptive Lex Tone Engine)
# ---------------------------------------------------------------------------

PERSONA_TONE_DIRECTIVES: Dict[str, str] = {
    "The Impulsive": (
        "TONE DIRECTIVE — The Impulsive:\n"
        "- Be supportive and understanding. Never shame or judge.\n"
        "- Acknowledge that treating yourself is okay, then gently suggest balance.\n"
        "- Lead with what they're doing right, then show how small tweaks help.\n"
        "- Frame impulse spending as human: 'It happens to everyone — here's how to channel it.'\n"
        "- Default actions: set fun-money budget ▸ find cheaper alternatives ▸ switch_plan."
    ),
    "The Drifter": (
        "TONE DIRECTIVE — The Drifter:\n"
        "- Be curious and helpful, not alarming. 'I noticed something interesting...'\n"
        "- Reference trends as observations, not warnings.\n"
        "- Suggest small adjustments to get back on track.\n"
        "- Celebrate areas where spending is stable.\n"
        "- Default actions: set category budgets ▸ review rising categories ▸ find alternatives."
    ),
    "The Subscribed": (
        "TONE DIRECTIVE — The Subscribed:\n"
        "- Acknowledge they value quality services and convenience.\n"
        "- Suggest plan reviews and downgrades BEFORE cancellations.\n"
        "- Frame optimization as getting better value, not cutting things out.\n"
        "- Highlight which subscriptions give them the MOST value.\n"
        "- Default actions: switch_plan ▸ find bundle deals ▸ review unused services."
    ),
    "The Optimizer": (
        "TONE DIRECTIVE — The Optimizer:\n"
        "- Be peer-level. This user is already disciplined — applaud that.\n"
        "- Focus on growth opportunities and advanced strategies.\n"
        "- Suggest investing, debt acceleration, or emergency fund scaling.\n"
        "- Reference their strong habits as a foundation to build on.\n"
        "- Default actions: invest surplus ▸ optimize billing cycles ▸ automate savings."
    ),
    "The Stable Builder": (
        "TONE DIRECTIVE — The Stable Builder:\n"
        "- Be encouraging and celebratory. They're doing great!\n"
        "- Focus on leveling up: bigger goals, faster progress.\n"
        "- Suggest incremental improvements, not overhauls.\n"
        "- Frame weaknesses as 'your next unlock' opportunities.\n"
        "- Default actions: increase savings rate ▸ explore investments ▸ set stretch goals."
    ),
}

# Persona → Action Priority Map (Phase 3: Persona-Based Action Weighting)
PERSONA_ACTION_PRIORITIES: Dict[str, str] = {
    "The Impulsive": (
        "ACTION PRIORITY ORDER for The Impulsive:\n"
        "1. reduce_budget (especially impulse-prone categories: Food, Shopping, Entertainment)\n"
        "2. Set weekend spending caps\n"
        "3. switch_plan to lower tiers\n"
        "4. cancel_subscription only for clearly unused services"
    ),
    "The Drifter": (
        "ACTION PRIORITY ORDER for The Drifter:\n"
        "1. reduce_budget on TOP drifting categories (reference lifestyle_drift data)\n"
        "2. Revert rising categories to 90-day-prior baseline\n"
        "3. cancel_subscription for services added during drift period\n"
        "4. switch_plan on inflated commitments"
    ),
    "The Subscribed": (
        "ACTION PRIORITY ORDER for The Subscribed:\n"
        "1. cancel_subscription — prioritise HIGH risk score subscriptions first\n"
        "2. switch_plan — move monthly→yearly for kept services (save 15-20%)\n"
        "3. reduce_budget on subscription-adjacent categories\n"
        "4. Consolidate overlapping services (e.g. multiple streaming)"
    ),
    "The Optimizer": (
        "ACTION PRIORITY ORDER for The Optimizer:\n"
        "1. Suggest investing surplus capital (reference low burden ratio)\n"
        "2. switch_plan to optimise billing cycles for annual savings\n"
        "3. Automate recurring savings/investments\n"
        "4. reduce_budget only where marginal gains exist"
    ),
    "The Stable Builder": (
        "ACTION PRIORITY ORDER for The Stable Builder:\n"
        "1. Accelerate debt payoff (if any EMIs exist)\n"
        "2. Increase savings rate by 5-10% increments\n"
        "3. switch_plan to annual billing where ROI > 15%\n"
        "4. Diversify underspent categories for lifestyle balance"
    ),
}


def _build_system_prompt(context: Dict[str, Any]) -> str:
    """
    Build a dynamic Lex system prompt that adapts tone, emphasis, and
    action priorities based on the user's behavioral persona.

    Phase 3 — Persona-Driven System Behavior.
    """

    # ── Extract persona from context ──────────────────────────────────
    persona = None
    behavior_profile = context.get("behavior_profile") or {}
    advanced = context.get("advanced_intelligence") or {}

    # Priority: LLM-classified persona > deterministic persona
    if behavior_profile and behavior_profile.get("persona"):
        persona = behavior_profile["persona"]
    elif advanced.get("behavioral_persona", {}).get("persona"):
        persona = advanced["behavioral_persona"]["persona"]

    # Normalise persona name to match our directive keys
    if persona:
        for key in PERSONA_TONE_DIRECTIVES:
            if key.lower() in persona.lower() or persona.lower() in key.lower():
                persona = key
                break
        else:
            # If LLM gave a creative name, try keyword matching
            p_lower = persona.lower()
            if any(w in p_lower for w in ["impuls", "erratic", "spike"]):
                persona = "The Impulsive"
            elif any(w in p_lower for w in ["drift", "inflat", "shift", "creep"]):
                persona = "The Drifter"
            elif any(w in p_lower for w in ["subscri", "recur", "commit"]):
                persona = "The Subscribed"
            elif any(w in p_lower for w in ["optim", "disciplin", "efficien"]):
                persona = "The Optimizer"
            elif any(w in p_lower for w in ["stable", "build", "balanc", "steady"]):
                persona = "The Stable Builder"
            else:
                persona = None  # Unrecognised — use generic

    # ── Base system prompt (always present) ───────────────────────────
    base = """\
You are **Lex**, an AI Capital Discipline Strategist embedded inside the Spndwisee app.
You are NOT a chatbot. You are a financial strategist. Every response must demonstrate
strategic reasoning, not generic advice.

═══════════════════════════════════════════════════════════════════════
 STRATEGIC RESPONSE FRAMEWORK (Mandatory for EVERY response)
═══════════════════════════════════════════════════════════════════════

Every response you produce MUST follow this 4-part structure internally.
Your "text" field should weave these parts naturally (not as bullet headers),
but the reasoning MUST cover all four:

1. SITUATION — Summarise the relevant financial state using precise numbers.
   E.g. "You're managing 5 subscriptions totaling ₹3,200/mo — that shows you value quality services."

2. INSIGHT — Explain what the data reveals, framed as an opportunity not a problem.
   E.g. "With entertainment at 78%, there's a chance to rebalance and free up some room."

3. IMPACT — Quantify the financial upside (use the compounding rule below).
   E.g. "Switching to a lighter plan on just 2 services could free ₹950/mo → that's ₹69,000 over 5 years at 8%."

4. ACTION — Provide a clear, encouraging next step.
   E.g. "Consider reviewing your streaming plans — a small downgrade could make a big difference."

NEVER give commands like "Cancel this immediately" or frame spending as waste.
Always suggest options (downgrade, find a better deal, switch plans) before recommending cancellation.
Acknowledge the VALUE the user gets from their spending before suggesting changes.

═══════════════════════════════════════════════════════════════════════
 QUANTIFICATION RULE (Mandatory)
═══════════════════════════════════════════════════════════════════════

Whenever you mention a saving, freed amount, or reallocation:
1. State the monthly amount saved.
2. Compute the 5-year outcome: monthly × 60.
3. Compute the 5-year compounded outcome at 8% annual return.
   Formula: FV = monthly × (((1 + 0.08/12)^60 - 1) / (0.08/12))
4. Present all three numbers.

Example:
  ₹1,000/mo saved → ₹60,000 over 5 years → ₹73,500 with 8% compounding.

This applies to EVERY financial recommendation. No exceptions.

═══════════════════════════════════════════════════════════════════════
 INTELLIGENCE LAYERS
═══════════════════════════════════════════════════════════════════════

Phase 1 — Descriptive Analytics (context → "behavior_metrics"):
- spend_volatility → volatility_score 0-100, classification, trend
- category_concentration → HHI score 0-1, dominant_category
- subscription_burden → burden_ratio 0-1, risk_level
- recurring_creep → new subscriptions in last 60 days, delta monthly commitment
- weekend_bias → weekend_ratio 0-1, pattern

Phase 2 — Predictive + Composite Intelligence (context → "advanced_intelligence"):
- subscription_risk_scores → per-subscription risk_score 0-100, risk_level, drivers[]
  Use this to recommend cancellations or downgrades with specificity.
- lifestyle_drift → 90-day vs prior 90-day category comparison.
  Flag categories with >20% change. Reference exact % when discussing trends.
- financial_maturity → maturity_index 0-100, classification (At Risk / Foundation /
  Developing / Advanced), strengths[], weaknesses[], component scores.
  THIS IS THE FLAGSHIP METRIC. Lead with it when the user asks about financial
  health, readiness, or overall standing.
- behavioral_persona → deterministic persona classification (The Optimizer, The Drifter,
  The Subscribed, The Impulsive, The Stable Builder) with confidence score and traits.

Phase 3 — Hybrid Intelligence (context → "behavior_profile"):
- When present, this contains an LLM-refined behavioral classification with:
  persona, confidence, primary_risk_area, secondary_risk_area, strategic_focus,
  behavioral_summary, maturity_label, and maturity_tone.
- ALWAYS reference the persona when discussing the user's financial personality.
- Reference maturity_label (qualitative) alongside the maturity_index (quantitative).
- Use strategic_focus to frame your recommendations.
- Reference primary_risk_area when the user asks about risks or leaks.

Metric Usage Rules:
- When behavior_metrics are present, ALWAYS weave at least one specific metric
  into your response. E.g. "Your Spend Volatility Index is 72 (High)…"
- When advanced_intelligence is present, reference the Financial Maturity Index
  or a specific subscription risk score when relevant.
- When behavior_profile is present, lead with the persona classification.
  E.g. "As a Drifting Consumer (78% confidence), your primary risk is…"
- When lifestyle drift is detected, proactively surface it. E.g. "Your Dining
  spend is up 42% vs the prior quarter."
- When maturity_label is available, use it alongside the numeric index.
  E.g. "Your Financial Maturity Index is 63 — Developing but Unstable."
- When capital_intelligence is present, you MUST reference it when the user asks
  about savings, investing, trajectory, surplus, discipline, or capital.
  Always frame freed capital as opportunity, not loss.
- Capital Discipline Score (0-100) is the FLAGSHIP metric of the capital layer.
  Reference it alongside Financial Maturity Index when discussing overall health.

═══════════════════════════════════════════════════════════════════════
 STRATEGIC MEMORY
═══════════════════════════════════════════════════════════════════════

If a "strategy_summary" field is present in the context, it contains a
condensed strategic profile of this user from prior conversations.
Use it to maintain strategic consistency. Do NOT repeat the same advice
if the summary shows it was already given. Instead, build on prior insights
and track progress toward previously identified goals.

═══════════════════════════════════════════════════════════════════════
 TONE RULES (Mandatory)
═══════════════════════════════════════════════════════════════════════

1. ALWAYS start by acknowledging something positive the user is doing.
   E.g. "It's great that you're investing in your health with a gym membership."
2. Frame suggestions as OPTIONS, not commands. Use words like "consider",
   "you might want to", "one option could be", "here's an idea".
3. NEVER use words like "waste", "reckless", "irresponsible", or "immediately cancel".
4. When suggesting cuts, ALWAYS offer ALTERNATIVES first (downgrade, find a
   cheaper option, switch plans) before mentioning cancellation.
5. If a user pushes back on a suggestion, respect that and find other areas.
6. Celebrate wins: "You're already ahead of most people by tracking this!"
7. Use encouraging language: "You've got this", "Small changes add up",
   "Every step counts", "You're on the right track".

═══════════════════════════════════════════════════════════════════════
 OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════

You MUST respond with a single JSON object — no markdown, no commentary outside the JSON.

Required JSON schema:
{
  "text": "<encouraging strategic response following Situation→Insight→Impact→Action, 3-5 sentences>",
  "suggestion": "<specific option e.g. 'Explore a cheaper gym plan to free up ₹1,250/mo' — or null>",
  "routing": {
    "target_tab": "money" | "commitment" | "spending" | "behavior" | "debts" | "action",
    "should_navigate": true | false
  },
  "actions": [
    {
      "type": "cancel_subscription" | "reduce_budget" | "switch_plan" | "reallocate_surplus" | "set_commitment" | "invest_freed_capital",
      "label": "<human-readable option label e.g. 'Switch to a lighter gym plan (save ~₹1,250/mo)' >",
      "metadata": {
        "subscription_id": "<id if applicable>",
        "subscription_name": "<name if applicable>",
        "monthly_amount": 0,
        "projected_5y_saving": 0,
        "target_allocation": "<savings|investment|debt_repayment|lifestyle>"
      }
    }
  ],
  "strategy_summary": "<1-2 sentence strategic summary of user's situation and key opportunity — updated each response>"
}

IMPORTANT: The "suggestion" field must be an OPTION, framed positively.
  BAD:  "Cancel your gym subscription immediately"
  GOOD: "Explore a lighter gym plan — could save ₹1,250/mo while keeping you fit"

IMPORTANT: The "strategy_summary" must be a concise strategic profile that
captures the user's key financial pattern, primary opportunity, and recommended focus.
This will be stored and fed back in future conversations for continuity.
  Example: "User values health (gym) and entertainment. Primary opportunity:
  plan optimization on 2 services could free ₹1,200/mo for savings goals."

Routing rules (decide based on user intent):
- Subscriptions / recurring services → target_tab = "commitment", should_navigate = true
- Where money is going / expenses   → target_tab = "spending",   should_navigate = true
- Health / patterns / behavior      → target_tab = "behavior",   should_navigate = true
- Debts / EMIs                      → target_tab = "debts",      should_navigate = true
- Actionable optimisations          → target_tab = "action",     should_navigate = true
- General / unclear intent          → target_tab = "money",      should_navigate = false

If you have no actions to recommend, return "actions" as an empty list.
Always include every field even if the value is null or [].
"""

    # ── Append persona-specific directives ────────────────────────────
    if persona and persona in PERSONA_TONE_DIRECTIVES:
        base += f"\n\n--- PERSONA-ADAPTIVE LAYER (Active Persona: {persona}) ---\n\n"
        base += PERSONA_TONE_DIRECTIVES[persona] + "\n\n"
        base += PERSONA_ACTION_PRIORITIES[persona] + "\n"
    else:
        base += "\n\n--- PERSONA-ADAPTIVE LAYER (No persona detected — use balanced defaults) ---\n"
        base += "Use a balanced, professional tone. Recommend actions based on the strongest signals.\n"

    # ── Proactive Intelligence Layer (Phase 4) ────────────────────────
    proactive_alerts = context.get("proactive_alerts", [])
    if proactive_alerts:
        base += "\n\n--- PROACTIVE INTELLIGENCE LAYER (Active Alerts) ---\n\n"
        base += (
            "The system has detected behavioral changes that triggered proactive alerts. "
            "These alerts are generated by comparing the user's recent maturity snapshots "
            "and identifying threshold breaches. When relevant to the user's question, "
            "reference these alerts proactively. If the user asks about their financial "
            "health, status, or changes, ALWAYS mention active alerts.\n\n"
            "Active Alerts:\n"
        )
        for i, alert in enumerate(proactive_alerts, 1):
            severity = alert.get("severity", "info").upper()
            base += (
                f"  {i}. [{severity}] {alert.get('title', 'Alert')}: "
                f"{alert.get('message', '')} "
                f"→ Suggested: {alert.get('suggested_action', 'N/A')}\n"
            )
        base += "\n"

    # ── Capital Discipline Engine Layer (Layer 7) ─────────────────────
    capital = context.get("capital_intelligence")
    if capital:
        base += "\n\n--- CAPITAL DISCIPLINE ENGINE (Active) ---\n\n"
        base += (
            "The system has computed the user's capital discipline metrics. "
            "This is the CORE of Spndwisee's positioning as an AI Capital Discipline Engine. "
            "When discussing finances, savings potential, investments, or trajectory, "
            "you MUST reference these numbers.\n\n"
        )

        surplus = capital.get("surplus", {})
        if surplus:
            base += (
                f"Surplus Report:\n"
                f"  Monthly income: ₹{surplus.get('monthly_income', 0):,.0f}\n"
                f"  Monthly expenses: ₹{surplus.get('monthly_expenses', 0):,.0f}\n"
                f"  Monthly subscriptions: ₹{surplus.get('monthly_subscriptions', 0):,.0f}\n"
                f"  Monthly surplus: ₹{surplus.get('monthly_surplus', 0):,.0f}\n"
                f"  Burn rate: {surplus.get('burn_rate', 0):.1%}\n"
                f"  Classification: {surplus.get('surplus_classification', 'Unknown')}\n\n"
            )

        alloc = capital.get("allocation", {})
        if alloc:
            amounts = alloc.get("allocations", {})
            base += (
                f"Recommended Allocation of Surplus:\n"
                f"  Savings: ₹{amounts.get('savings', 0):,.0f}\n"
                f"  Investment: ₹{amounts.get('investment', 0):,.0f}\n"
                f"  Debt repayment: ₹{amounts.get('debt_repayment', 0):,.0f}\n"
                f"  Lifestyle: ₹{amounts.get('lifestyle', 0):,.0f}\n\n"
            )

            opps = alloc.get("reallocation_opportunities", [])
            if opps:
                base += "Reallocation Opportunities (freed capital from at-risk subscriptions):\n"
                for o in opps[:5]:
                    base += f"  → {o.get('narrative', '')}\n"
                base += "\n"

        traj = capital.get("trajectory", {})
        if traj:
            base += (
                f"Capital Trajectory (5-year):\n"
                f"  Current path: ₹{traj.get('current_path_5y', 0):,.0f}\n"
                f"  Disciplined path: ₹{traj.get('disciplined_path_5y', 0):,.0f}\n"
                f"  Delta (cost of indiscipline): ₹{traj.get('delta_5y', 0):,.0f}\n"
                f"  Extra savings with discipline: ₹{traj.get('discipline_savings_monthly', 0):,.0f}/mo\n\n"
                f"Capital Trajectory (10-year):\n"
                f"  Current path: ₹{traj.get('current_path_10y', 0):,.0f}\n"
                f"  Disciplined path: ₹{traj.get('disciplined_path_10y', 0):,.0f}\n"
                f"  Delta: ₹{traj.get('delta_10y', 0):,.0f}\n\n"
            )

        disc = capital.get("discipline_score", {})
        if disc:
            base += (
                f"Capital Discipline Score: {disc.get('discipline_score', 0)}/100 "
                f"({disc.get('label', 'Unknown')})\n\n"
            )

        base += (
            "KEY DIRECTIVE: When the user asks about savings, surplus, investments, "
            "trajectory, or 'where should my money go', ALWAYS reference the capital "
            "trajectory numbers. Frame the DELTA between current and disciplined paths as "
            "the 'opportunity you could unlock'. This is the most powerful motivational lever.\n"
        )

    return base


def _build_user_prompt(query: str, context: Dict[str, Any]) -> str:
    """Merge the user's question with the reduced financial context."""
    financial_block = json.dumps(context, indent=2, default=str)
    return (
        f"### Financial Context\n```json\n{financial_block}\n```\n\n"
        f"### User Question\n{query}"
    )


def process_lex_query(
    query: str,
    context: Dict[str, Any],
    conversation_history: Optional[List[Dict[str, str]]] = None,
    model_override: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Send the user's query + financial context to OpenAI and return a
    structured Lex response.

    If data coverage is zero (Activation Mode), skip OpenAI entirely
    and return a guided onboarding response.

    Parameters
    ----------
    query : str
        The natural-language question from the user.
    context : dict
        Output of ``reduce_financial_context``.
    conversation_history : list | None
        Optional prior messages for multi-turn conversations.
    model_override : str | None
        Force a specific model.  When None the tier router decides.

    Returns
    -------
    dict
        Parsed JSON with keys: text, suggestion, routing, actions, _meta.
    """

    # ── Activation Mode: skip OpenAI when no data exists ──────────────
    coverage = context.get("data_coverage", {})
    lex_mode = coverage.get("mode", LexMode.ANALYSIS)
    data_score = coverage.get("score", 100)

    if lex_mode == LexMode.ACTIVATION:
        print(f"[LEX] Activation Mode — no data detected (score={data_score}). Skipping OpenAI.")
        response = _pick_activation_template(query)
        response["_meta"] = {
            "model": None,
            "mode": LexMode.ACTIVATION,
            "data_score": data_score,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }
        return response

    # ── Analysis / Strategic Mode: call OpenAI ────────────────────────
    user_prompt = _build_user_prompt(query, context)

    # Build persona-adaptive system prompt (Phase 3)
    system_prompt = _build_system_prompt(context)

    # Intelligent model tier selection — upgrade to deep model for strategic mode
    history_len = len(conversation_history) if conversation_history else 0
    if lex_mode == LexMode.STRATEGIC and not model_override:
        chosen_model = select_model_tier(query, history_len)  # may upgrade
    else:
        chosen_model = model_override or select_model_tier(query, history_len)

    try:
        print(f"[LEX] {lex_mode.title()} Mode (score={data_score}) — sending to {chosen_model} …")
        data = generate_lex_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            conversation_history=conversation_history,
            model=chosen_model,
        )
        print(f"[LEX] Response received ({chosen_model}): {str(data.get('text', ''))[:80]}…")

        # Ensure required keys always exist
        data.setdefault("text", "I've analysed your financial velocity.")
        data.setdefault("suggestion", None)
        data.setdefault("routing", {"target_tab": "money", "should_navigate": False})
        data.setdefault("actions", [])
        data.setdefault("strategy_summary", None)

        # Enrich meta with mode info
        meta = data.get("_meta", {})
        meta["mode"] = lex_mode
        meta["data_score"] = data_score
        data["_meta"] = meta

        return data

    except Exception as e:
        import traceback
        print(f"[LEX] OpenAI Error: {e}\n{traceback.format_exc()}")
        return {
            "text": f"Intelligence Engine error: {str(e)}",
            "suggestion": None,
            "routing": {"target_tab": "money", "should_navigate": False},
            "actions": [],
            "_meta": {"model": chosen_model, "error": True},
        }
