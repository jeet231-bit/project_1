"""
Layer 4 — Lex Conversation Persistence Router
==============================================
Manages long-term intelligence memory stored in Supabase.

Tables: lex_conversations, lex_messages, lex_action_log
"""

from fastapi import APIRouter, Depends, Body, HTTPException
from typing import Dict, Any, List, Optional
from ..dependencies import get_db, get_current_user

router = APIRouter()


# ── Conversations ──────────────────────────────────────────────────────────

@router.post("/")
async def create_conversation(
    payload: Dict[str, Any] = Body(default={}),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Start a new Lex conversation session."""
    user_id = user.user.id
    title = payload.get("title", "New conversation")
    model = payload.get("model", "gpt-4o-mini")

    result = (
        db.table("lex_conversations")
        .insert({"user_id": user_id, "title": title, "model": model})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    return result.data[0]


@router.get("/")
async def list_conversations(
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List all conversations for the current user (newest first)."""
    result = (
        db.table("lex_conversations")
        .select("*")
        .eq("user_id", user.user.id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a single conversation with its messages."""
    convo = (
        db.table("lex_conversations")
        .select("*")
        .eq("id", conversation_id)
        .eq("user_id", user.user.id)
        .execute()
    )
    if not convo.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.table("lex_messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    return {
        "conversation": convo.data[0],
        "messages": messages.data or [],
    }


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a conversation and its messages (cascade)."""
    db.table("lex_conversations").delete().eq("id", conversation_id).eq(
        "user_id", user.user.id
    ).execute()
    return {"message": "Conversation deleted"}


# ── Messages ───────────────────────────────────────────────────────────────

@router.post("/{conversation_id}/messages")
async def append_messages(
    conversation_id: str,
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Append one or more messages to a conversation.
    Payload:
    {
        "messages": [
            { "role": "user",      "content": "..." },
            { "role": "assistant", "content": "...", "model": "gpt-4o-mini", "tokens_used": 320 }
        ]
    }
    """
    messages: List[Dict[str, Any]] = payload.get("messages", [])
    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    # Verify conversation belongs to user
    convo_check = (
        db.table("lex_conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("user_id", user.user.id)
        .execute()
    )
    if not convo_check.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    rows = [
        {
            "conversation_id": conversation_id,
            "role": m["role"],
            "content": m["content"],
            "model": m.get("model"),
            "tokens_used": m.get("tokens_used"),
        }
        for m in messages
    ]

    result = db.table("lex_messages").insert(rows).execute()

    # Persist strategic memory — update conversation's strategy_summary
    # if the assistant included one in its response
    strategy_summary = payload.get("strategy_summary")
    update_fields = {"updated_at": "now()"}
    if strategy_summary:
        update_fields["strategy_summary"] = strategy_summary

    db.table("lex_conversations").update(
        update_fields
    ).eq("id", conversation_id).execute()

    return {"inserted": len(result.data) if result.data else 0}


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get all messages for a conversation (chronological)."""
    # Ownership check
    convo_check = (
        db.table("lex_conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("user_id", user.user.id)
        .execute()
    )
    if not convo_check.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.table("lex_messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    return messages.data or []


# ── Action Audit Log ───────────────────────────────────────────────────────

@router.post("/{conversation_id}/actions/log")
async def log_actions(
    conversation_id: str,
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Log executed actions tied to a conversation for audit trail.
    Payload:
    {
        "results": [
            { "action_type": "cancel_subscription", "label": "Cancel Netflix",
              "metadata": {...}, "status": "success", "detail": "..." }
        ]
    }
    """
    results: List[Dict[str, Any]] = payload.get("results", [])
    user_id = user.user.id

    rows = [
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "action_type": r.get("action_type", r.get("type", "unknown")),
            "label": r.get("label", ""),
            "metadata": r.get("metadata", {}),
            "status": r.get("status", "unknown"),
            "detail": r.get("detail", r.get("reason", "")),
        }
        for r in results
    ]

    result = db.table("lex_action_log").insert(rows).execute()
    return {"logged": len(result.data) if result.data else 0}


@router.get("/actions/history")
async def get_action_history(
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get all action audit logs for the user."""
    result = (
        db.table("lex_action_log")
        .select("*")
        .eq("user_id", user.user.id)
        .order("executed_at", desc=True)
        .execute()
    )
    return result.data or []
