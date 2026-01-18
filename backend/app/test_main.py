from fastapi.testclient import TestClient
from app.main import app
from datetime import date, timedelta

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the spndwisee API"}

def test_create_subscription():
    response = client.post("/subscriptions/", json={
        "id": 3,
        "name": "Test Subscription",
        "category": "Testing",
        "amount": 10.0,
        "billing_cycle": "monthly",
        "next_renewal_date": "2024-08-01",
        "auto_pay": True,
        "status": "active"
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Test Subscription"

def test_get_subscriptions():
    response = client.get("/subscriptions/")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_create_expense():
    response = client.post("/expenses/", json={
        "id": 3,
        "name": "Test Expense",
        "amount": 25.0,
        "category": "Testing",
        "date": "2024-07-20",
        "payment_method": "Test Card"
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Test Expense"

def test_get_expenses():
    response = client.get("/expenses/")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_get_monthly_spend():
    response = client.get("/dashboard/monthly-spend")
    assert response.status_code == 200
    assert "monthly_spend" in response.json()

def test_get_yearly_spend():
    response = client.get("/dashboard/yearly-spend")
    assert response.status_code == 200
    assert "yearly_spend" in response.json()

def test_get_active_subscriptions_count():
    response = client.get("/dashboard/active-subscriptions-count")
    assert response.status_code == 200
    assert "active_subscriptions_count" in response.json()

def test_get_category_wise_aggregation():
    response = client.get("/dashboard/category-wise-aggregation")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)

def test_get_upcoming_renewals():
    response = client.get("/dashboard/upcoming-renewals")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_insights():
    response = client.get("/insights/")
    assert response.status_code == 200
    assert len(response.json()) > 0
    assert "text" in response.json()[0]
