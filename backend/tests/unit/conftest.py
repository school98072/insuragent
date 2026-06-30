"""
Shared test fixtures for insurance AI backend unit tests.

Provides:
  - Mock get_structured_llm factory that returns controllable Pydantic schema responses
  - make_anthropic_response helper (kept for legacy test compatibility)
  - Test claim data factories with realistic Chinese insurance data
  - Session store cleanup between tests
"""
import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch
from types import SimpleNamespace


# ---------------------------------------------------------------------------
# Legacy Anthropic response factory (kept for backward-compat)
# ---------------------------------------------------------------------------

def make_anthropic_response(text: str):
    """Create a mock Anthropic messages.create() return value."""
    content_block = SimpleNamespace(text=text)
    return SimpleNamespace(content=[content_block])


@pytest.fixture
def mock_anthropic_client():
    """A pre-built mock Anthropic client whose messages.create() returns configurable JSON."""
    client = MagicMock()
    client.messages.create.return_value = make_anthropic_response(
        json.dumps({
            "estimated_amount": 30000.0,
            "damage_severity": "medium",
            "notes": "Reasonable claim within limits.",
        })
    )
    return client


# ---------------------------------------------------------------------------
# Structured-LLM mock factory
# ---------------------------------------------------------------------------

def make_structured_llm_mock(return_value):
    """
    Return a (mock_llm, provider_str) tuple where mock_llm.ainvoke() resolves
    to ``return_value`` (a Pydantic model instance or dict).
    """
    mock_llm = AsyncMock(return_value=return_value)
    return mock_llm, "gemini"


# ---------------------------------------------------------------------------
# Test claim data factories (Chinese insurance domain)
# ---------------------------------------------------------------------------

def _make_claim(**overrides):
    """Factory for creating SimpleNamespace claim objects for testing."""
    defaults = {
        "id": "CLM-TEST-001",
        "claim_type": "医疗险",
        "incident_description": "患者张三，住院费用¥35,000，诊断：急性阑尾炎",
        "claimed_amount": 35000.0,
        "policy_number": "POL-2024-001",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


@pytest.fixture
def medical_claim():
    """Medical insurance claim — acute appendicitis, ¥35k."""
    return _make_claim()


@pytest.fixture
def auto_claim():
    """Auto insurance claim — vehicle collision in Beijing, ¥12.5k."""
    return _make_claim(
        id="CLM-TEST-002",
        claim_type="车险",
        incident_description="车辆碰撞，维修费¥12,500，地点：北京市朝阳区",
        claimed_amount=12500.0,
        policy_number="POL-2024-002",
    )


@pytest.fixture
def property_claim():
    """Property insurance claim — burst pipe, ¥8k."""
    return _make_claim(
        id="CLM-TEST-003",
        claim_type="财产险",
        incident_description="水管爆裂导致财产损失¥8,000",
        claimed_amount=8000.0,
        policy_number="POL-2024-003",
    )


# ---------------------------------------------------------------------------
# Mock DB session
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    """Mock SQLAlchemy session that returns a policy with coverage details."""
    policy = SimpleNamespace(
        policy_number="POL-2024-001",
        coverage_details={
            "type": "医疗险",
            "max_coverage": 500000,
            "deductible": 1000,
            "exclusions": ["美容手术", "既往症"],
        },
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = policy
    return db


# ---------------------------------------------------------------------------
# Session store cleanup
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clear_session_store():
    """Reset the global session store before each test to avoid cross-contamination."""
    from app.services.ai.agents import _SESSION_STORE
    _SESSION_STORE.clear()
    yield
    _SESSION_STORE.clear()
