"""
Behavior Classifier — LLM Interpretation Layer
================================================

Accepts deterministic metrics from behavior_engine.py and uses
gpt-4o-mini to produce:

- Refined persona classification with nuance
- Qualitative maturity label
- Strategic focus area
- Behavioral summary

RULES:
  - LLM NEVER computes numbers. Only interprets structured outputs.
  - Temperature 0.3 for consistency.
  - Forced JSON response mode.
  - Cached per user — recomputed only when data changes or 30 days pass.
"""

from openai import OpenAI
import os
import json
from typing import Dict, Any, Optional
from datetime import datetime

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CLASSIFIER_MODEL = "gpt-4o-mini"
CLASSIFIER_TEMPERATURE = 0.3
CLASSIFIER_MAX_TOKENS = 512


# ─── System Prompt ─────────────────────────────────────────────────────────

CLASSIFIER_SYSTEM_PROMPT = """\
You are a behavioral financial analyst.

You will receive structured financial metrics computed by a deterministic engine.
You must classify the user's financial behavior profile.

STRICT RULES:
- Do NOT invent any data or numbers.
- Only interpret the metrics provided.
- Respond strictly in JSON.
- Keep classification professional and concise.
- All text fields should be 1-2 sentences max.

Your response must match this exact JSON schema:
{
  "persona": "<string: refined persona name — creative but professional>",
  "confidence": <float: 0.0 to 1.0>,
  "primary_risk_area": "<string: the most critical financial risk>",
  "secondary_risk_area": "<string: the second risk area, or 'None' if none>",
  "strategic_focus": "<string: 1-sentence actionable strategic recommendation>",
  "behavioral_summary": "<string: 2-sentence personality-style financial profile>",
  "maturity_label": "<string: qualitative label for the maturity index, e.g. 'Developing but Unstable'>",
  "maturity_tone": "<string: one of 'positive', 'cautionary', 'critical', 'neutral'>"
}
"""


# ─── Classifier Function ──────────────────────────────────────────────────

def classify_behavior_profile(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send deterministic metrics to gpt-4o-mini for behavioral classification.

    Parameters
    ----------
    metrics : dict
        Combined Phase 1 + Phase 2 metrics from behavior_engine.

    Returns
    -------
    dict
        LLM-generated classification with persona, risks, summary, and maturity label.
    """
    # Build the metrics payload for the LLM — flatten key signals
    llm_input = _prepare_classifier_input(metrics)

    try:
        response = client.chat.completions.create(
            model=CLASSIFIER_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(llm_input, indent=2, default=str)},
            ],
            temperature=CLASSIFIER_TEMPERATURE,
            max_tokens=CLASSIFIER_MAX_TOKENS,
        )

        raw = response.choices[0].message.content
        usage = response.usage

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = _fallback_classification(metrics)

        # Ensure all required fields exist
        data.setdefault("persona", "Unclassified")
        data.setdefault("confidence", 0.5)
        data.setdefault("primary_risk_area", "Unknown")
        data.setdefault("secondary_risk_area", "None")
        data.setdefault("strategic_focus", "Continue monitoring spending patterns.")
        data.setdefault("behavioral_summary", "Insufficient data for detailed classification.")
        data.setdefault("maturity_label", "Developing")
        data.setdefault("maturity_tone", "neutral")

        data["_meta"] = {
            "model": CLASSIFIER_MODEL,
            "prompt_tokens": usage.prompt_tokens if usage else None,
            "completion_tokens": usage.completion_tokens if usage else None,
            "total_tokens": usage.total_tokens if usage else None,
            "classified_at": datetime.utcnow().isoformat(),
        }
        return data

    except Exception as e:
        print(f"[CLASSIFIER] OpenAI classification failed: {e}")
        fallback = _fallback_classification(metrics)
        fallback["_meta"] = {"model": None, "error": str(e), "fallback": True}
        return fallback


def _prepare_classifier_input(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Extract and flatten key signals for LLM consumption."""
    # Phase 1
    vol = metrics.get("spend_volatility", {})
    conc = metrics.get("category_concentration", {})
    burden = metrics.get("subscription_burden", {})
    creep = metrics.get("recurring_creep", {})
    weekend = metrics.get("weekend_bias", {})

    # Phase 2
    maturity = metrics.get("financial_maturity", {})
    drift = metrics.get("lifestyle_drift", {})
    persona_rule = metrics.get("behavioral_persona", {})

    # Top drift categories
    drift_cats = {}
    for d in drift.get("categories", [])[:3]:
        drift_cats[d.get("category", "?")] = d.get("change_pct", 0)

    return {
        "volatility_score": vol.get("volatility_score", 0),
        "volatility_classification": vol.get("classification", "Unknown"),
        "volatility_trend": vol.get("trend", "unknown"),
        "subscription_burden_ratio": burden.get("burden_ratio", 0),
        "subscription_burden_risk": burden.get("risk_level", "N/A"),
        "category_concentration_hhi": conc.get("concentration_score", 0),
        "dominant_category": conc.get("dominant_category", "Unknown"),
        "new_subscriptions_60d": creep.get("new_subscriptions_60d", 0),
        "weekend_ratio": weekend.get("weekend_ratio", 0),
        "weekend_pattern": weekend.get("pattern", "Unknown"),
        "lifestyle_drift_detected": drift.get("drift_detected", False),
        "lifestyle_drift_categories": drift_cats,
        "financial_maturity_index": maturity.get("maturity_index", 50),
        "maturity_classification": maturity.get("classification", "Unknown"),
        "maturity_strengths": maturity.get("strengths", []),
        "maturity_weaknesses": maturity.get("weaknesses", []),
        "rule_based_persona": persona_rule.get("persona", "Unknown"),
        "rule_based_confidence": persona_rule.get("confidence", 0),
    }


def _fallback_classification(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Return the deterministic persona as-is when LLM fails."""
    persona_rule = metrics.get("behavioral_persona", {})
    maturity = metrics.get("financial_maturity", {})

    return {
        "persona": persona_rule.get("persona", "The Stable Builder"),
        "confidence": persona_rule.get("confidence", 0.5),
        "primary_risk_area": persona_rule.get("primary_risk_area", "Unknown"),
        "secondary_risk_area": persona_rule.get("secondary_risk_area", "None"),
        "strategic_focus": "Continue tracking expenses and reviewing subscription usage.",
        "behavioral_summary": persona_rule.get("description", "Building financial awareness."),
        "maturity_label": maturity.get("classification", "Developing"),
        "maturity_tone": "neutral",
    }


# ─── Cache Check Helper ───────────────────────────────────────────────────

def should_reclassify(
    last_analysis_ts: Optional[str],
    data_coverage_score: int = 0,
    max_age_days: int = 30,
) -> bool:
    """
    Determine whether re-classification is needed.

    Re-classify when:
      - No prior classification exists
      - Data coverage is sufficient (score > 50)
      - Last analysis is older than max_age_days
    """
    if data_coverage_score < 50:
        return False  # Not enough data — don't waste an API call

    if not last_analysis_ts:
        return True  # Never classified

    try:
        last = datetime.fromisoformat(last_analysis_ts.replace("Z", "+00:00")).replace(tzinfo=None)
        age = (datetime.utcnow() - last).days
        return age >= max_age_days
    except Exception:
        return True  # Can't parse — reclassify
