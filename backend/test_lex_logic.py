import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.lex import process_lex_query, reduce_financial_context

# Mock context
context = {
    "user_id": "test_user",
    "metrics": {
        "total_monthly_subs": 2500,
        "active_subs_count": 2,
    },
    "subscriptions": [
        {"name": "Netflix", "amount": 199, "cycle": "monthly", "category": "Entertainment"},
        {"name": "Gym", "amount": 2000, "cycle": "monthly", "category": "Health"}
    ],
    "recent_expenses": [
        {"name": "Coffee", "amount": 150, "category": "Food"},
        {"name": "Uber", "amount": 350, "category": "Transport"}
    ]
}

print("Testing process_lex_query (Interactive - Subscriptions)...")
try:
    res = process_lex_query("Show me my subscriptions", context)
    print("\nResult 1 (Sub):", res)
    if 'suggestion' in res:
        print(f"SUCCESS: Found suggestion: {res['suggestion']}")
    else:
        print("WARNING: No suggestion found!")
except Exception as e:
    import traceback
    traceback.print_exc()

print("\nTesting process_lex_query (Interactive - Money Going)...")
try:
    res = process_lex_query("Where is my money going?", context)
    print("\nResult 3 (Money):", res)
    if 'suggestion' in res and res.get('suggestion'):
        print(f"SUCCESS: Found suggestion: {res['suggestion']}")
    else:
        print("WARNING: No suggestion found or empty!")
except Exception as e:
    import traceback
    traceback.print_exc()
