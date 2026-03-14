import os
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import HTTPException, Header, Depends

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Supabase URL and Key must be set in .env file")

supabase: Client = create_client(url, key)

def get_db():
    return supabase

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        if not user:
             raise HTTPException(status_code=401, detail="Invalid Token")
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
