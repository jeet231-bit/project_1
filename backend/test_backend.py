import requests
import time

URL = "http://localhost:8000/insights/lex/query"
# We need a token, but let's try a health check first to see if it responds fast
try:
    print("Testing /health...")
    h = requests.get("http://localhost:8000/health", timeout=5)
    print("Health response:", h.json())
    
    # Now let's try the lex endpoint - we'll skip auth for a moment if we can,
    # or just see if it hangs on the connection.
    # Actually, the real one needs Bearer token.
    print("Testing /insights/lex/query (no auth)...")
    r = requests.post(URL, json={"query": "test"}, timeout=5)
    print("Lex response (unauth):", r.status_code, r.text)
except Exception as e:
    print("Error during test:", e)
