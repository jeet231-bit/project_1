from pydantic import BaseModel
from datetime import date
from typing import Dict, Any

class Subscription(BaseModel):
    id: int
    name: str
    category: str
    amount: float
    billing_cycle: str
    next_renewal_date: date
    auto_pay: bool
    status: str

class Expense(BaseModel):
    id: int
    name: str
    amount: float
    category: str
    date: date
    payment_method: str

class Insight(BaseModel):
    text: str
    type: str
    metadata: Dict[str, Any]
