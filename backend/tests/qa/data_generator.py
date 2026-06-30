import json
from typing import List, Dict
from pydantic import BaseModel, Field
from app.core.config import settings
from app.utils.logger import get_logger
from app.services.ai.llm_factory import get_structured_llm

logger = get_logger(__name__)

class RareScenario(BaseModel):
    scenario_id: str = Field(..., description="Unique ID for the scenario")
    claim_type: str = Field(..., description="Type of claim (e.g. 跨境医疗险, 特种车险)")
    description: str = Field(..., description="A 5W1H detailed unstructured description of a rare long-tail event.")
    expected_complexity: str = Field(..., description="Why this is complex (e.g. subrogation, rare local hospital rules)")

class RareScenarioList(BaseModel):
    scenarios: List[RareScenario] = Field(description="A list of rare insurance scenarios.")

class DataGenerator:
    """Agent that generates synthetic rare scenarios (Black Swan cases)."""
    
    def __init__(self):
        self.model = settings.DEFAULT_LLM_MODEL
        
    def generate_scenarios(self, count: int = 3) -> List[Dict]:
        system = """
        You are a Black Swan Event Expert and Global Actuary. 
        Generate completely distinct, rare, and complex insurance claim scenarios.
        Examples include multi-vehicle pileups abroad involving subrogation, localized rural hospital billing anomalies, etc.
        Output MUST be a valid JSON array of objects matching the RareScenario schema.
        """
        
        prompt = f"Generate {count} extremely rare but realistic insurance claim scenarios."
        
        try:
            llm, _ = get_structured_llm(RareScenarioList, self.model)
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ]
            response = llm.invoke(messages)
            
            return [s.dict() for s in response.scenarios]
        except Exception as e:
            logger.error(f"DataGenerator failed: {e}")
            return []
