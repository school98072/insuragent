import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch
from types import SimpleNamespace

from app.services.ai.agents import (
    ClaimsAIOrchestrator,
    DamageAssessmentSchema,
    PolicyCoverageSchema,
    ClaimDecisionSchema,
    SourceCitation
)

# Global store for captured inputs during testing
captured_inputs = {}

def mock_get_structured_llm(schema, *args, **kwargs):
    """
    Mock factory to bypass real API calls during flow testing.
    Captures prompt messages and returns predetermined schema instances.
    """
    class MockRunnable:
        def __init__(self, schema):
            self.schema = schema

        async def ainvoke(self, messages, *args, **kwargs):
            # Capture prompt messages for verification
            captured_inputs[self.schema.__name__] = [str(m) for m in messages]
            
            # Return realistic mock instances based on requested schema
            if self.schema == DamageAssessmentSchema:
                return DamageAssessmentSchema(
                    estimated_amount=5200.0,
                    damage_severity="medium",
                    notes="Visual inspection indicates bumper repair needed.",
                    red_flags=[]
                )
            elif self.schema == PolicyCoverageSchema:
                return PolicyCoverageSchema(
                    is_covered=True,
                    coverage_reason="Bumper collision is covered under standard motor policy.",
                    applicable_clauses=["Section 2.1 - Collision Coverage"],
                    deductible_applied=500.0,
                    citations=[
                        SourceCitation(
                            document_name="HSBC Motor Insurance Policy Document",
                            clause_number="Section 2.1",
                            exact_quote="Collision Coverage applies to tree impacts."
                        )
                    ]
                )
            elif self.schema == ClaimDecisionSchema:
                return ClaimDecisionSchema(
                    decision="approve",
                    confidence=0.95,
                    reasoning="The damage matches collision coverage and is approved after deductible.",
                    recommended_amount=4700.0, # 5200 - 500
                    citations=[
                        SourceCitation(
                            document_name="HSBC Motor Insurance Policy Document",
                            clause_number="Section 2.1",
                            exact_quote="Collision Coverage applies to tree impacts."
                        )
                    ]
                )
            else:
                raise ValueError(f"Unknown schema in test mock: {self.schema}")

    return MockRunnable(schema), "mock_provider"


@pytest.mark.asyncio
@patch("app.services.ai.agents.get_structured_llm", side_effect=mock_get_structured_llm)
async def test_sequential_integration_flow(mock_llm_factory):
    """
    Sequential Integration Flow Test:
    Mocks LLMs using schema-based outputs while executing the actual RAG pipeline 
    and verifying data flow, prompts, and output citations.
    """
    captured_inputs.clear()
    orchestrator = ClaimsAIOrchestrator()

    # Define a mock claim model with realistic inputs
    claim = SimpleNamespace(
        id="TEST-CLAIM-001",
        claim_type="Motor Insurance",
        incident_description="Car hit a tree. Bumper damaged.",
        claimed_amount=5200.0,
        policy_number="Hsbc Motor Insurance Policy Document"
    )

    # Define mock database session
    db = MagicMock()

    # Define realistic OCR data
    ocr_data = {
        "text": "Receipt Amount: HKD 5,200 for Bumper Repair",
        "confidence": 0.9
    }

    # Mock the RAG search agent to return standard text chunks
    mock_rag_docs = [
        {
            "source": "HSBC Motor Insurance Policy Document",
            "category": "clause",
            "text": "Section 2.1: Collision Coverage applies to tree impacts.",
            "score": 0.95
        }
    ]
    
    with patch.object(orchestrator, "_run_rag_agent", new_callable=AsyncMock, 
                      return_value=("mock formatted rag context", mock_rag_docs)):
        # Run the full claims evaluation flow
        result = await orchestrator.analyze_claim(claim, db, ocr_data)

    # Assert correct execution of the sequential multi-agent orchestrator
    assert result["decision"] == "approve"
    assert result["confidence"] == 0.95
    assert result["recommended_amount"] == 4700.0
    
    # Assert metadata structures exist
    assert "damage_assessment" in result["metadata"]
    assert "policy_coverage" in result["metadata"]
    assert "rag_sources" in result["metadata"]
    assert "HSBC Motor Insurance Policy Document" in result["metadata"]["rag_sources"]

    # Verify Citations flow
    assert len(result["citations"]) == 1
    citation = result["citations"][0]
    assert citation["document_name"] == "HSBC Motor Insurance Policy Document"
    assert citation["clause_number"] == "Section 2.1"
    assert "Collision" in citation["exact_quote"]

    # Assert proper context injection into LLM prompts
    assert "DamageAssessmentSchema" in captured_inputs
    assert "PolicyCoverageSchema" in captured_inputs
    assert "ClaimDecisionSchema" in captured_inputs

    damage_prompt = str(captured_inputs["DamageAssessmentSchema"])
    assert "mock formatted rag context" in damage_prompt, "RAG context not properly injected into Damage agent!"

    policy_prompt = str(captured_inputs["PolicyCoverageSchema"])
    assert "Section 2.1 - Collision Coverage" not in policy_prompt, "Expected policy coverage schema variables to be passed cleanly."
