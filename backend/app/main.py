from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import time

load_dotenv()
from .routers import subscriptions, expenses, dashboard, insights, actions, conversations, capital, commitments, onboarding, bank_accounts, export, chatbot, budgets

app = FastAPI(
    title="spndwisee API",
    description="Backend for the spndwisee application.",
    version="0.1.0",
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Allow deployed frontend origin via env var (e.g. https://your-app.vercel.app)
import os
_extra_origin = os.environ.get("FRONTEND_URL")
if _extra_origin:
    origins.append(_extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"\n[DEBUG] Incoming request: {request.method} {request.url.path}")
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    print(f"[DEBUG] Finished request: {request.method} {request.url.path} in {process_time:.2f}s Status: {response.status_code}")
    return response

app.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])
app.include_router(actions.router, prefix="/actions", tags=["actions"])
app.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
app.include_router(capital.router, prefix="/capital", tags=["capital"])
app.include_router(commitments.router, prefix="/commitments", tags=["commitments"])
app.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
app.include_router(bank_accounts.router, prefix="/bank-accounts", tags=["bank-accounts"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["chatbot"])
app.include_router(budgets.router, prefix="/budgets", tags=["budgets"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the spndwisee API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
