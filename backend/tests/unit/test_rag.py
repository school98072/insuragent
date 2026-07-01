"""
Unit tests for app.services.ai.rag — RAGService (refactored)

Covers:
  - classify_chunk_with_llm: LLM-driven semantic classification via mocked structured output
  - _classify_chunk_heuristic: keyword fallback logic (still exercised internally)
  - RAGService.search: real LanceDB browse mode and semantic search with mocked DB
  - build_rag_prompt: XML context assembly from retrieved docs
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.config import settings
settings.ENABLE_LLM_RAG_FORMATTING = True

from app.services.ai.rag import (
    RAGService,
    ChunkCategorySchema,
    classify_chunk_with_llm,
    _classify_chunk_heuristic,
    StructuredRAGChunk,
    restructure_chunk_with_llm,
)


# ===========================================================================
# _classify_chunk_heuristic — synchronous keyword fallback
# ===========================================================================

class TestClassifyChunkHeuristic:
    """Verify heuristic fallback covers expected keyword signals."""

    def test_law_signal_returns_law(self):
        assert _classify_chunk_heuristic("保险法规", "第十六条规定……") == "law"

    def test_case_signal_in_text_returns_case(self):
        assert _classify_chunk_heuristic("General", "该案例涉及争议赔付……") == "case"

    def test_process_signal_returns_process(self):
        assert _classify_chunk_heuristic("理赔流程", "报案后需提交申请表……") == "process"

    def test_default_returns_clause(self):
        assert _classify_chunk_heuristic("家财险条款", "本保单承保的范围包括……") == "clause"

    def test_empty_strings_return_clause(self):
        assert _classify_chunk_heuristic("", "") == "clause"


# ===========================================================================
# classify_chunk_with_llm — LLM semantic classification
# ===========================================================================

class TestClassifyChunkWithLLM:
    """Verify LLM classification uses structured output and falls back gracefully."""

    async def test_should_return_llm_category_on_success(self):
        """When LLM succeeds, return its structured category."""
        mock_result = ChunkCategorySchema(category="process", confidence=0.95)
        mock_llm = AsyncMock(return_value=mock_result)

        with patch("app.services.ai.rag.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await classify_chunk_with_llm("理赔指引", "请在48小时内报案并提交申请表。")

        assert result == "process"

    async def test_should_fallback_to_heuristic_on_llm_error(self):
        """When LLM raises, fall back to _classify_chunk_heuristic without crashing."""
        mock_llm = AsyncMock(side_effect=RuntimeError("LLM unavailable"))

        with patch("app.services.ai.rag.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await classify_chunk_with_llm("保险法", "本法律条款规定……")

        # Heuristic should match "法" → "law"
        assert result == "law"

    async def test_should_return_clause_for_generic_policy_text(self):
        """Generic policy text should land in 'clause' via fallback."""
        mock_llm = AsyncMock(side_effect=Exception("timeout"))

        with patch("app.services.ai.rag.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await classify_chunk_with_llm("普通保单", "本保险产品承保意外伤害……")

        assert result == "clause"


# ===========================================================================
# restructure_chunk_with_llm — LLM semantic cleaning and titling
# ===========================================================================

class TestRestructureChunkWithLLM:
    """Verify LLM restructuring structures chunks and falls back gracefully."""

    async def test_should_return_llm_structured_chunk_on_success(self):
        """When LLM succeeds, return its structured output fields."""
        mock_result = StructuredRAGChunk(
            title="Clean Title",
            structured_content="Clean Content",
            clause_number="Clause 1.2"
        )
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_result)

        with patch("app.services.ai.rag.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await restructure_chunk_with_llm("Doc", "Raw Text")

        assert result.title == "Clean Title"
        assert result.structured_content == "Clean Content"
        assert result.clause_number == "Clause 1.2"

    async def test_should_fallback_to_raw_text_on_llm_error(self):
        """When LLM raises, fall back gracefully to a basic StructuredRAGChunk using first line as title."""
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=Exception("error"))

        with patch("app.services.ai.rag.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await restructure_chunk_with_llm("Doc", "First Line\nSecond Line")

        assert result.title == "First Line"
        assert result.structured_content == "First Line\nSecond Line"
        assert result.clause_number == ""


# ===========================================================================
# RAGService.search — LanceDB integration (mocked)
# ===========================================================================

class TestRAGSearch:
    """Verify search returns properly structured results from real LanceDB calls."""

    @pytest.fixture
    def service(self):
        return RAGService()

    @pytest.fixture
    def sample_lancedb_rows(self):
        return [
            {
                "policy_title": "汽车保险综合条款",
                "text": "被保险车辆发生碰撞事故，经核定属于保险责任范围内的，予以赔付。",
                "_distance": 0.2,
            },
            {
                "policy_title": "理赔操作流程",
                "text": "投保人须在出险后48小时内向公司报案，并提供事故经过说明。",
                "_distance": 0.4,
            },
        ]

    async def test_should_return_empty_list_when_table_missing(self, service):
        """When policy_chunks table does not exist, return [] without raising."""
        mock_db = MagicMock()
        mock_db.table_names.return_value = []

        with patch("app.services.ai.rag.lancedb.connect", return_value=mock_db):
            result = await service.search("车险理赔")

        assert result == []

    async def test_should_return_formatted_results_with_required_keys(
        self, service, sample_lancedb_rows
    ):
        """Each result must contain score, source, text, category."""
        mock_tbl = MagicMock()
        mock_tbl.search.return_value.limit.return_value.to_list.return_value = sample_lancedb_rows
        mock_db = MagicMock()
        mock_db.table_names.return_value = ["policy_chunks"]
        mock_db.open_table.return_value = mock_tbl

        # Mock classify so tests don't need a real LLM
        with patch("app.services.ai.rag.lancedb.connect", return_value=mock_db), \
             patch("app.services.ai.rag.classify_chunk_with_llm", new_callable=AsyncMock, return_value="clause"):
            results = await service.search("车险理赔", top_k=2)

        assert len(results) <= 2
        for r in results:
            assert "score" in r
            assert "source" in r
            assert "text" in r
            assert "category" in r
            assert r["category"] in ("law", "case", "process", "clause")

    async def test_should_respect_top_k_parameter(self, service, sample_lancedb_rows):
        """Results must not exceed top_k."""
        mock_tbl = MagicMock()
        mock_tbl.search.return_value.limit.return_value.to_list.return_value = sample_lancedb_rows
        mock_db = MagicMock()
        mock_db.table_names.return_value = ["policy_chunks"]
        mock_db.open_table.return_value = mock_tbl

        with patch("app.services.ai.rag.lancedb.connect", return_value=mock_db), \
             patch("app.services.ai.rag.classify_chunk_with_llm", new_callable=AsyncMock, return_value="clause"):
            results = await service.search("任意查询", top_k=1)

        assert len(results) <= 1

    async def test_should_return_empty_on_lancedb_exception(self, service):
        """Gracefully return [] when LanceDB raises an unexpected error."""
        with patch("app.services.ai.rag.lancedb.connect", side_effect=Exception("DB error")):
            result = await service.search("保险条款")

        assert result == []

    async def test_browse_mode_should_call_search_without_query(self, service):
        """Empty query triggers browse mode (no vector search call)."""
        mock_tbl = MagicMock()
        mock_tbl.search.return_value.limit.return_value.to_list.return_value = []
        mock_db = MagicMock()
        mock_db.table_names.return_value = ["policy_chunks"]
        mock_db.open_table.return_value = mock_tbl

        with patch("app.services.ai.rag.lancedb.connect", return_value=mock_db), \
             patch("app.services.ai.rag.classify_chunk_with_llm", new_callable=AsyncMock, return_value="clause"):
            result = await service.search("")

        # Browse mode calls tbl.search() with no arguments
        mock_tbl.search.assert_called_once_with()
        assert isinstance(result, list)

    async def test_category_filter_should_restrict_results(self, service, sample_lancedb_rows):
        """When category_filter is set, only matching-category results are returned."""
        mock_tbl = MagicMock()
        mock_tbl.search.return_value.limit.return_value.to_list.return_value = sample_lancedb_rows
        mock_db = MagicMock()
        mock_db.table_names.return_value = ["policy_chunks"]
        mock_db.open_table.return_value = mock_tbl

        # Force all chunks to classify as "law" except we want "process" filter → empty
        with patch("app.services.ai.rag.lancedb.connect", return_value=mock_db), \
             patch("app.services.ai.rag.classify_chunk_with_llm", new_callable=AsyncMock, return_value="law"):
            results = await service.search("碰撞事故", category_filter="process")

        # All chunks were classified as "law", so filtering for "process" yields []
        assert results == []


# ===========================================================================
# RAGService.build_rag_prompt
# ===========================================================================

class TestRAGPromptBuilding:
    """Verify the RAG prompt assembles context correctly."""

    @pytest.fixture
    def service(self):
        return RAGService()

    async def test_should_include_all_context_docs_in_prompt(self, service):
        docs = [
            {"source": "条款A", "score": 0.9, "text": "承保范围：意外伤害"},
            {"source": "流程B", "score": 0.8, "text": "报案须知"},
        ]
        prompt = await service.build_rag_prompt("我的车撞了", docs)
        assert "承保范围" in prompt
        assert "报案须知" in prompt

    async def test_should_include_source_and_relevance_in_prompt(self, service):
        docs = [{"source": "主险条款", "score": 0.95, "text": "附加险除外"}]
        prompt = await service.build_rag_prompt("理赔申请", docs)
        assert "主险条款" in prompt
        assert "0.95" in prompt or "Relevance" in prompt

    async def test_should_handle_empty_context_docs(self, service):
        prompt = await service.build_rag_prompt("query", [])
        assert "<context>" in prompt
        assert "query" in prompt

    async def test_should_route_graph_sources_to_graph_section(self, service):
        docs = [
            {"source": "Neo4j Graph: 疾病关联", "score": 0.85, "text": "图谱关系：肺癌→既往症"},
            {"source": "保单条款", "score": 0.80, "text": "主险承保范围"},
        ]
        prompt = await service.build_rag_prompt("肺癌理赔", docs)
        assert "policy_graph_relationships" in prompt
        assert "knowledge_base_retrieval" in prompt


# ===========================================================================
# RAGService.get_financial_nodes — legacy shim
# ===========================================================================

class TestFinancialNodes:
    @pytest.fixture
    def service(self):
        return RAGService()

    async def test_should_return_concept_with_related_nodes(self, service):
        result = await service.get_financial_nodes("免赔额")
        assert result["concept"] == "免赔额"
        assert isinstance(result["related_nodes"], list)

    async def test_should_include_concept_name_in_dependency_path(self, service):
        result = await service.get_financial_nodes("既往症")
        assert "既往症" in result["dependencies"]
