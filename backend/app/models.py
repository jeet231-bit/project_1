from pydantic import BaseModel
from datetime import date, datetime
from typing import Dict, Any, Optional, List

class Subscription(BaseModel):
    id: Optional[int] = None
    name: str
    category: str
    amount: float
    billing_cycle: str
    next_renewal_date: date
    auto_pay: bool = True
    status: str = "active"

class Expense(BaseModel):
    id: Optional[int] = None
    name: str
    amount: float
    category: str
    date: date
    payment_method: str

class BankAccount(BaseModel):
    id: Optional[int] = None
    bank_name: str
    account_type: str = "Savings"
    balance: float = 0
    last_four: str

class Insight(BaseModel):
    text: str
    type: str
    metadata: Dict[str, Any]


# ─── Fixed Commitments Model ─────────────────────────────────────────────────

class CommitmentCreate(BaseModel):
    name: str
    category: str
    amount: float
    frequency: str = "monthly"
    is_active: bool = True

class FixedCommitment(BaseModel):
    id: int
    name: str
    category: str
    amount: float
    frequency: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─── Capital Discipline Engine Models ────────────────────────────────────────

class IncomeCreate(BaseModel):
    source: str
    amount: float
    frequency: str = "monthly"
    is_active: bool = True

class Income(BaseModel):
    id: int
    source: str
    amount: float
    frequency: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AllocationPreferencesUpdate(BaseModel):
    savings_pct: float = 50.0
    investment_pct: float = 30.0
    debt_repayment_pct: float = 10.0
    lifestyle_pct: float = 10.0

class AllocationPreferences(BaseModel):
    id: Optional[int] = None
    savings_pct: float
    investment_pct: float
    debt_repayment_pct: float
    lifestyle_pct: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SurplusReport(BaseModel):
    monthly_income: float
    monthly_expenses: float
    monthly_subscriptions: float
    monthly_surplus: float
    burn_rate: float                          # expenses / income (0-1+)
    income_sources: List[Dict[str, Any]]
    surplus_classification: str               # "Healthy" | "Thin" | "Deficit"


class AllocationRecommendation(BaseModel):
    surplus: float
    allocations: Dict[str, float]             # {"savings": 5000, "investment": 3000, ...}
    percentages: Dict[str, float]             # {"savings": 50, "investment": 30, ...}
    reallocation_opportunities: List[Dict[str, Any]]  # freed capital suggestions


class TrajectoryForecast(BaseModel):
    current_path_5y: float
    disciplined_path_5y: float
    current_path_10y: float
    disciplined_path_10y: float
    delta_5y: float                           # difference between disciplined and current
    delta_10y: float
    monthly_surplus_current: float
    monthly_surplus_disciplined: float
    forecast_series: List[Dict[str, Any]]     # [{month, current, disciplined}, ...]
