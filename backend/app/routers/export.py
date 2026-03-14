"""
Export router — provides data export endpoints for the Export Vault.
"""

import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from ..dependencies import get_db, get_current_user

router = APIRouter()


@router.get("/full-profile")
def export_full_profile(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Returns the user's entire financial profile as a JSON bundle:
    income, expenses, subscriptions, bank accounts, commitments.
    """
    user_id = user.user.id

    income = (db.table("income").select("*").eq("user_id", user_id).execute()).data or []
    expenses = (db.table("expenses").select("*").eq("user_id", user_id).execute()).data or []
    subscriptions = (db.table("subscriptions").select("*").eq("user_id", user_id).execute()).data or []
    bank_accounts = (db.table("bank_accounts").select("*").eq("user_id", user_id).execute()).data or []

    # Try commitments (may not exist)
    try:
        commitments = (db.table("fixed_commitments").select("*").eq("user_id", user_id).execute()).data or []
    except Exception:
        commitments = []

    total_income = sum(r.get("amount", 0) for r in income)
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    total_subs = sum(s.get("amount", 0) for s in subscriptions if s.get("status") == "active")
    total_bank_balance = sum(b.get("balance", 0) for b in bank_accounts)

    return {
        "exported_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "total_subscriptions": total_subs,
            "total_bank_balance": total_bank_balance,
            "net_surplus": total_income - total_expenses - total_subs,
            "counts": {
                "income_sources": len(income),
                "expenses": len(expenses),
                "subscriptions": len(subscriptions),
                "bank_accounts": len(bank_accounts),
                "commitments": len(commitments),
            },
        },
        "income": income,
        "expenses": expenses,
        "subscriptions": subscriptions,
        "bank_accounts": bank_accounts,
        "commitments": commitments,
    }


@router.get("/expenses-csv")
def export_expenses_csv(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Returns all user expenses as a downloadable CSV file.
    """
    user_id = user.user.id
    expenses = (db.table("expenses").select("*").eq("user_id", user_id).execute()).data or []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Name", "Category", "Amount", "Payment Method"])

    for e in sorted(expenses, key=lambda x: x.get("date", ""), reverse=True):
        writer.writerow([
            e.get("date", ""),
            e.get("name", ""),
            e.get("category", ""),
            e.get("amount", 0),
            e.get("payment_method", ""),
        ])

    output.seek(0)
    filename = f"expenses_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/monthly-statement")
def export_monthly_statement(user=Depends(get_current_user), db=Depends(get_db)):
    """
    Returns a structured monthly financial statement.
    """
    user_id = user.user.id

    income = (db.table("income").select("*").eq("user_id", user_id).execute()).data or []
    expenses = (db.table("expenses").select("*").eq("user_id", user_id).execute()).data or []
    subscriptions = (db.table("subscriptions").select("*").eq("user_id", user_id).eq("status", "active").execute()).data or []

    total_income = sum(r.get("amount", 0) for r in income)
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    total_subs = sum(s.get("amount", 0) for s in subscriptions)

    # Category-wise expense breakdown
    category_breakdown = {}
    for e in expenses:
        cat = e.get("category", "Other")
        category_breakdown[cat] = category_breakdown.get(cat, 0) + e.get("amount", 0)

    # Sort categories by spend
    sorted_categories = sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)

    return {
        "status": "ok",
        "statement": {
            "period": datetime.utcnow().strftime("%B %Y"),
            "income": {
                "total": total_income,
                "sources": [{"source": r.get("source", ""), "amount": r.get("amount", 0)} for r in income],
            },
            "subscriptions": {
                "total": total_subs,
                "count": len(subscriptions),
                "items": [{"name": s.get("name", ""), "amount": s.get("amount", 0)} for s in subscriptions],
            },
            "expenses": {
                "total": total_expenses,
                "count": len(expenses),
                "category_breakdown": [{"category": cat, "amount": amt} for cat, amt in sorted_categories],
            },
            "net_surplus": total_income - total_expenses - total_subs,
        },
    }
