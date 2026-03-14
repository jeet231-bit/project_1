from openai import OpenAI
import os
import json
from typing import Optional

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Model Tier System ──────────────────────────────────────────────────────
# Tier 1 (fast + cheap):  gpt-4o-mini  — everyday Lex queries
# Tier 2 (high-value):    gpt-4o       — deep analysis, long-term strategy

MODEL_FAST  = "gpt-4o-mini"      # Tier 1 — default for every query
MODEL_DEEP  = "gpt-4o"           # Tier 2 — reserved for high-value analysis
DEFAULT_MODEL = MODEL_FAST

# Temperature presets per tier
TIER_CONFIG = {
    MODEL_FAST: {"temperature": 0.4, "max_tokens": 1500},
    MODEL_DEEP: {"temperature": 0.3, "max_tokens": 2500},
}


def select_model_tier(query: str, history_len: int = 0) -> str:
    """
    Heuristic model router — upgrades to gpt-4o when the query
    warrants deeper analysis.

    Current rules:
    - Long conversations (>10 turns) get deep model
    - Explicit strategy / analysis keywords get deep model
    - Everything else stays on fast tier
    """
    deep_keywords = [
        "strategy", "long-term", "plan", "optimise", "optimize",
        "projection", "forecast", "retire", "invest", "deep analysis",
        "annual review", "full audit", "comprehensive",
    ]
    q_lower = query.lower()
    if any(kw in q_lower for kw in deep_keywords):
        return MODEL_DEEP
    if history_len > 10:
        return MODEL_DEEP
    return MODEL_FAST


def generate_lex_response(
    system_prompt: str,
    user_prompt: str,
    conversation_history: Optional[list] = None,
    model: Optional[str] = None,
) -> dict:
    """
    Call OpenAI Chat Completions with forced JSON output.

    Parameters
    ----------
    system_prompt : str
        The system-level instruction (Lex persona + rules).
    user_prompt : str
        The current user message.
    conversation_history : list | None
        Optional list of prior {"role": ..., "content": ...} messages
        for multi-turn conversations.
    model : str | None
        Override model.  When None the fast tier is used.

    Returns
    -------
    dict  — Parsed JSON response with an extra "_meta" key holding model info.
    """
    chosen_model = model or DEFAULT_MODEL
    cfg = TIER_CONFIG.get(chosen_model, TIER_CONFIG[MODEL_FAST])

    messages = [{"role": "system", "content": system_prompt}]

    if conversation_history:
        messages.extend(conversation_history)

    messages.append({"role": "user", "content": user_prompt})

    response = client.chat.completions.create(
        model=chosen_model,
        response_format={"type": "json_object"},
        messages=messages,
        temperature=cfg["temperature"],
        max_tokens=cfg["max_tokens"],
    )

    usage = response.usage
    raw = response.choices[0].message.content

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"text": raw, "routing": {"target_tab": "money", "should_navigate": False}}

    # Attach metadata for upstream layers (persistence, billing, etc.)
    data["_meta"] = {
        "model": chosen_model,
        "prompt_tokens": usage.prompt_tokens if usage else None,
        "completion_tokens": usage.completion_tokens if usage else None,
        "total_tokens": usage.total_tokens if usage else None,
    }
    return data
