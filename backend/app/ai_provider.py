from abc import ABC, abstractmethod
from typing import List, Dict, Any
from .models import Insight

class AIProvider(ABC):
    @abstractmethod
    def get_insights(self, user_data: Dict[str, Any]) -> List[Insight]:
        """
        Generates insights based on user data.
        """
        pass

class MockAIProvider(AIProvider):
    """
    A mock AI provider that returns a fixed set of rule-based insights.
    """
    def get_insights(self, user_data: Dict[str, Any]) -> List[Insight]:
        mock_insights = [
            Insight(
                text="Based on your recent spending, you could save an estimated $50 this month by reducing impulse purchases.",
                type="savings_suggestion",
                metadata={"area": "spending_habits"}
            ),
            Insight(
                text="You have two subscriptions in the 'Entertainment' category. Consolidating them could save you money.",
                type="subscription_analysis",
                metadata={"category": "Entertainment", "count": 2}
            )
        ]
        return mock_insights

class LexAIProvider(AIProvider):
    """
    Stub for the Lex AI provider (formerly Liquid AI).
    
    NOTE: This is a placeholder and is not integrated with any inference engine yet.
    """
    def __init__(self, model_path: str = "lfm2.5-1.2b-instruct-q4_k_m.gguf"):
        self.model_path = model_path

    def get_insights(self, user_data: Dict[str, Any]) -> List[Insight]:
        # This is a stub. No actual inference is performed.
        raise NotImplementedError("Lex AI provider is not yet implemented.")

def get_ai_provider(provider_name: str = "mock") -> AIProvider:
    if provider_name == "lex_ai" or provider_name == "liquid_ai":
        return LexAIProvider()
    elif provider_name == "mock":
        return MockAIProvider()
    else:
        raise ValueError(f"Unknown AI provider: {provider_name}")
