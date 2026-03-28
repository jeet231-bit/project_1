import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from ..dependencies import get_db, get_current_user

router = APIRouter()

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
MODEL_NAME = "gpt-4o-mini"

class ChatMessage(BaseModel):
    role: str
    parts: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = []

SYSTEM_INSTRUCTION = (
    "You are the Premium Support Bot for XpendWise, a modern AI-driven financial capital discipline engine. "
    "Your role is to assist users with system-generated problems and queries (like Zomato or Swiggy support). "
    "Handle queries about privacy, safety, security, app features, navigation, and troubleshooting. "
    "Keep your tone modern, classy, sleek, premium, professional, yet approachable and extremely helpful. "
    "Never give specific individual financial advice (Lex does that). You are the app's overall support and helpdesk bot. "
    "\n\nFORMATTING RULES (follow strictly):\n"
    "1. Keep responses concise (under 150 words).\n"
    "2. Use short paragraphs (2-3 sentences max).\n"
    "3. Use bullet points (•) for lists — never numbered lists.\n"
    "4. Bold key terms with **double asterisks**.\n"
    "5. Add a blank line between sections for readability.\n"
    "6. At the very end of EVERY response, add exactly 2-3 follow-up questions the user might ask, "
    "each on its own line prefixed with [SUGGEST] — these will be shown as clickable chips. Example:\n"
    "[SUGGEST] How is my data encrypted?\n"
    "[SUGGEST] Can I delete my account?\n"
    "[SUGGEST] What data do you collect?\n"
)


@router.post("/message", response_model=ChatResponse)
async def chat_with_bot(request: ChatRequest, user=Depends(get_current_user)):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set in .env")

    try:
        messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
        for msg in request.messages:
            role = "assistant" if msg.role == "assistant" else "user"
            messages.append({"role": role, "content": msg.parts})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {"model": MODEL_NAME, "messages": messages, "max_tokens": 512}

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(OPENAI_URL, json=payload, headers=headers)

        if resp.status_code != 200:
            print(f"[CHATBOT] OpenAI Error {resp.status_code}: {resp.text[:300]}")
            raise HTTPException(status_code=500, detail=f"OpenAI error: {resp.text}")

        data = resp.json()
        raw_reply = data["choices"][0]["message"]["content"]

        # Parse out [SUGGEST] lines
        lines = raw_reply.split("\n")
        suggestions = []
        clean_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("[SUGGEST]"):
                suggestions.append(stripped.replace("[SUGGEST]", "").strip())
            else:
                clean_lines.append(line)

        # Remove trailing blank lines
        while clean_lines and not clean_lines[-1].strip():
            clean_lines.pop()

        return {"reply": "\n".join(clean_lines), "suggestions": [suggestions[i] for i in range(min(3, len(suggestions)))]}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[CHATBOT] Error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
