import json
from typing import Dict, Any, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings
from app.utils.logger import get_logger
from app.services.ai.llm_factory import get_structured_llm

logger = get_logger(__name__)

class JudgeScore(BaseModel):
    decision_status: Literal["Passed", "Flawed", "Failed"] = Field(..., description="Overall evaluation of the system's decision.")
    faithfulness: int = Field(..., ge=1, le=5, description="Faithfulness to the claim context (1-5).")
    logical_consistency: int = Field(..., ge=1, le=5, description="Logical consistency of the multi-agent reasoning (1-5).")
    fraud_detection: int = Field(..., ge=1, le=5, description="Effectiveness of fraud/compliance monitoring (1-5).")
    reasoning: str = Field(..., description="Detailed justification for the scores and decision status.")

class JudgeAgent:
    """LLM-as-a-Judge for the Multi-Agent Claim System."""
    
    def __init__(self):
        self.model = settings.DEFAULT_LLM_MODEL

    def evaluate_claim_state(self, final_state: Dict[str, Any], expected_outcome: str = None) -> JudgeScore:
        """Evaluate the entire LangGraph trace and final decision."""
        
        system_prompt = f"""
        You are an independent Senior Claims Auditor (Judge Agent).
        Your task is to evaluate the decision trace of an automated Multi-Agent Insurance Claim System.
        
        You will receive the final State Graph output, which includes:
        - claim_data: The initial claim context.
        - damage_report: The evaluation from the Damage Agent.
        - clause_report: The evaluation from the Policy/Clause Agent.
        - monitor_report: The evaluation from the Monitoring (Fraud) Agent.
        - final_decision: The final decision made by the Orchestrator/Decision Agent.
        
        Expected Outcome (if provided): {expected_outcome}
        
        Output MUST strictly match this JSON schema:
        {JudgeScore.schema_json()}
        """
        
        prompt = f"System State Trace:\n{json.dumps(final_state, ensure_ascii=False, indent=2)}\n\nPlease provide your evaluation in JSON."
        
        try:
            llm, _ = get_structured_llm(JudgeScore, self.model)
            messages = [
                SystemMessage(
                    content=system_prompt,
                    additional_kwargs={"cache_control": {"type": "ephemeral"}}
                ),
                HumanMessage(content=prompt)
            ]
            
            # get_structured_llm already returns the parsed Pydantic object
            return llm.invoke(messages)
        except Exception as e:
            logger.error(f"Judge Agent error: {e}")
            return JudgeScore(
                decision_status="Failed",
                faithfulness=1,
                logical_consistency=1,
                fraud_detection=1,
                reasoning=f"Judge failed to evaluate: {str(e)}"
            )
