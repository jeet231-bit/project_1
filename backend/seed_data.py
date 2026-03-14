import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(url, key)

def seed():
    # Get any user or used fixed user if needed
    # For now, let's just see if we can get the current session user_id or just insert for a known one
    # Actually, we should probably insert for the user currently logged in
    # But since I don't know the user_id, I'll try to find one
    users = supabase.auth.admin.list_users()
    if not users:
        print("No users found")
        return
    
    for user_obj in users:
        target_user = user_obj.id
        print(f"Seeding for user: {target_user}")

        # Subscriptions
        subs = [
            {
                "user_id": target_user, 
                "name": "Netflix", 
                "amount": 199, 
                "billing_cycle": "monthly", 
                "category": "Entertainment", 
                "status": "active",
                "next_renewal_date": "2026-02-18"
            },
            {
                "user_id": target_user, 
                "name": "Gym", 
                "amount": 2000, 
                "billing_cycle": "monthly", 
                "category": "Health", 
                "status": "active",
                "next_renewal_date": "2026-02-01"
            }
        ]
        
        # Expenses
        exps = [
            {
                "user_id": target_user, 
                "name": "Coffee", 
                "amount": 150, 
                "category": "Food",
                "date": "2026-01-18",
                "payment_method": "UPI"
            },
            {
                "user_id": target_user, 
                "name": "Uber", 
                "amount": 350, 
                "category": "Transport",
                "date": "2026-01-17",
                "payment_method": "Credit Card"
            }
        ]


        try:
            # Use insert instead of upsert to avoid conflict errors if no unique constraint exists
            supabase.table("subscriptions").insert(subs).execute()
            supabase.table("expenses").insert(exps).execute()
            print(f"Successfully seeded for {target_user}")
        except Exception as e:
            print(f"Error seeding for {target_user}: {e}")


if __name__ == "__main__":
    seed()
