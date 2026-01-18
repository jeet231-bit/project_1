from fastapi import APIRouter, Depends
from ..models import Insight
from typing import List
from ..ai_provider import AIProvider, get_ai_provider

router = APIRouter()

@router.get("/", response_model=List[Insight])
def get_insights(ai_provider: AIProvider = Depends(get_ai_provider)):
    # In a real application, you'd pass relevant user data here.
    user_data = {} 
    return ai_provider.get_insights(user_data)
