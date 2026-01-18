from fastapi import FastAPI
from .routers import subscriptions, expenses, dashboard, insights

app = FastAPI(
    title="spndwisee API",
    description="Backend for the spndwisee application.",
    version="0.1.0",
)



app.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the spndwisee API"}
