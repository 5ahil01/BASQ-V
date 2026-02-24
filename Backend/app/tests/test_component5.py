import pytest
from unittest.mock import MagicMock, patch
from typing import List, Dict

from app.self_reflective_rag.retrieval_quality_assessor import RetrievalQualityAssessor
from app.self_reflective_rag.adaptive_retriever import AdaptiveRetriever
from app.self_reflective_rag.answer_verifier import AnswerVerifier
from app.self_reflective_rag.self_corrector import SelfCorrector
from app.self_reflective_rag.self_reflective_rag import SelfReflectiveRAG

# -----------------------------------------------------------------------------
# Test RetrievalQualityAssessor
# -----------------------------------------------------------------------------

class TestRetrievalQualityAssessor:
    def setup_method(self):
        self.assessor = RetrievalQualityAssessor()

    def test_relevance_high(self):
        query = "Show revenue for 2023"
        chunks = ["The revenue for 2023 was high.", "2023 financial report shows good revenue."]
        score = self.assessor.calculate_relevance(query, chunks)
        assert score > 0.5

    def test_relevance_low(self):
        query = "Show revenue for 2023"
        chunks = ["The cat sat on the mat.", "I like apples."]
        score = self.assessor.calculate_relevance(query, chunks)
        assert score < 0.3

    def test_coverage_perfect(self):
        query = "sales by region"
        chunks = ["We have sales data for every region including North, South."]
        score = self.assessor.calculate_coverage(query, chunks)
        assert score >= 0.9

    def test_assess_overall(self):
        query = "profit margin"
        chunks = ["Profit margin is calculated as net income divided by revenue."]
        result = self.assessor.assess(query, chunks)
        assert 'overall_confidence' in result
        assert 0.0 <= result['overall_confidence'] <= 1.0
        assert not result['needs_more_retrieval'] # Should be good enough

    def test_assess_empty(self):
        result = self.assessor.assess("query", [])
        assert result['overall_confidence'] == 0.0
        assert result['needs_more_retrieval']

# -----------------------------------------------------------------------------
# Test AdaptiveRetriever
# -----------------------------------------------------------------------------

class TestAdaptiveRetriever:
    def setup_method(self):
        self.mock_rag = MagicMock()
        self.mock_assessor = MagicMock()
        self.retriever = AdaptiveRetriever(self.mock_rag, self.mock_assessor)

    def test_retrieve_converges_immediately(self):
        self.mock_rag.retrieve_context.return_value = ["chunk1", "chunk2", "chunk3"]
        self.mock_assessor.assess.return_value = {'overall_confidence': 0.85}
        
        result = self.retriever.retrieve_adaptively("query")
        
        assert result['iterations'] == 1
        assert result['total_chunks_retrieved'] == 3
        assert result['final_confidence'] == 0.85
        assert self.mock_rag.retrieve_context.call_count == 1

    def test_retrieve_needs_more(self):
        # First call low confidence, second call high confidence
        self.mock_rag.retrieve_context.side_effect = [
            ["chunk1"], # Iter 1
            ["chunk2", "chunk3"] # Iter 2
        ]
        self.mock_assessor.assess.side_effect = [
            {'overall_confidence': 0.3}, # Low
            {'overall_confidence': 0.8}  # High
        ]
        
        result = self.retriever.retrieve_adaptively("query")
        
        # Should iterate twice
        assert result['iterations'] == 2
        assert len(result['chunks']) >= 2
        assert result['final_confidence'] == 0.8

    def test_max_iterations(self):
        self.mock_rag.retrieve_context.return_value = ["chunk"]
        self.mock_assessor.assess.return_value = {'overall_confidence': 0.1} # Always low
        
        result = self.retriever.retrieve_adaptively("query")
        
        assert result['iterations'] == 5 # Max default
        assert result['status'] == 'max_iterations_reached'

# -----------------------------------------------------------------------------
# Test AnswerVerifier
# -----------------------------------------------------------------------------

class TestAnswerVerifier:
    def setup_method(self):
        self.verifier = AnswerVerifier()

    def test_extract_sql_elements(self):
        sql = "SELECT id, name FROM users WHERE age > 18"
        elements = self.verifier.extract_sql_elements(sql)
        assert "USERS" in elements['tables'] or "users" in elements['tables'] # Case might vary
        # My implementation upper-cases everything in extract_sql_elements logic if I recall correctly
        # Let's check implementation. Yes, sql.upper().
        assert "USERS" in elements['tables']
        assert "ID" in elements['columns']
        assert "NAME" in elements['columns']

    def test_verify_faithful(self):
        sql = "SELECT revenue FROM sales"
        query = "show revenue"
        chunks = ["The sales table contains revenue column."]
        
        result = self.verifier.verify(sql, query, chunks)
        
        assert result['verified']
        assert result['faithfulness_score'] == 1.0

    def test_verify_hallucination(self):
        sql = "SELECT secret_code FROM users"
        query = "show codes"
        chunks = ["We represent users by email only."] # No mention of secret_code
        
        result = self.verifier.verify(sql, query, chunks)
        
        assert not result['verified']
        assert "Column: SECRET_CODE" in result['unsupported_elements']

# -----------------------------------------------------------------------------
# Test SelfCorrector
# -----------------------------------------------------------------------------

class TestSelfCorrector:
    def setup_method(self):
        self.mock_retriever = MagicMock()
        self.mock_generator = MagicMock()
        self.mock_verifier = MagicMock()
        self.corrector = SelfCorrector(self.mock_retriever, self.mock_generator, self.mock_verifier)

    def test_correct_successful(self):
        # Setup: Generator produces bad SQL first (handled outside), then corrector fixes it
        # Here we test corrector.correct()
        
        # Generator returns fixed SQL
        self.mock_generator.generate.return_value = "SELECT correct FROM table"
        
        # Verifier says fixed SQL is good
        self.mock_verifier.verify.return_value = {'verified': True, 'issues': []}
        
        issues = [{'type': 'unsupported_column', 'value': 'wrong'}]
        chunks = ["context"]
        
        result = self.corrector.correct("SELECT wrong FROM table", "query", issues, chunks)
        
        assert result['success']
        assert result['corrected_sql'] == "SELECT correct FROM table"
        assert result['attempts'] == 1

    def test_correct_fail(self):
        self.mock_generator.generate.return_value = "SELECT still_wrong FROM table"
        self.mock_verifier.verify.return_value = {'verified': False, 'issues': [{'type': 'error'}]}
        
        issues = [{'type': 'error'}]
        result = self.corrector.correct("SELECT wrong", "query", issues, [])
        
        assert not result['success']
        assert result['attempts'] == 3 # Max attempts

# -----------------------------------------------------------------------------
# Test SelfReflectiveRAG (Integration)
# -----------------------------------------------------------------------------

class TestSelfReflectiveRAG:
    def setup_method(self):
        self.mock_rag = MagicMock()
        self.mock_scorer = MagicMock()
        self.mock_generator = MagicMock()
        
        # Mock retrieval response
        self.mock_rag.retrieve_context.return_value = ["chunk1"]
        
        # Mock generator response
        self.mock_generator.generate.return_value = "SELECT * FROM data"
        
        # Mock scorer response
        self.mock_scorer.score.return_value = {'overall_confidence': 0.9, 'recommendation': 'EXECUTE'}
        
        self.system = SelfReflectiveRAG(self.mock_rag, self.mock_scorer, self.mock_generator)
        
        # Mock internal components to simplify integration test
        self.system.retrieval_assessor.assess = MagicMock(return_value={'overall_confidence': 0.9})
        self.system.answer_verifier.verify = MagicMock(return_value={'verified': True, 'faithfulness_score': 1.0, 'issues': []})

    def test_end_to_end_success(self):
        result = self.system.query_with_reflection("test query")
        
        assert result['status'] == 'success'
        assert result['retrieval_iterations'] >= 1
        assert result['sql'] == "SELECT * FROM data"
        assert result['sql_confidence'] == 0.9

    def test_end_to_end_correction(self):
        # Force verification failure initially logic
        # This is hard to mock purely on integration class without mocking the *internal* corrector logic 
        # or stepping through state.
        # But we can mock the verifier to fail first time? 
        # Since we mocked self.system.answer_verifier in setup, let's change it.
        
        # Verifier: Fail first (called in main flow), Pass second (called in corrector)
        # But corrector uses its own verifier instance references? No, it uses the ones passed to it.
        # Check SelfReflectiveRAG.__init__: 
        # self.answer_verifier = AnswerVerifier()
        # self.self_corrector = SelfCorrector(..., self.answer_verifier)
        # So they share the instance.
        
        self.system.answer_verifier.verify.side_effect = [
            {'verified': False, 'faithfulness_score': 0.5, 'issues': [{'type': 'bad'}]}, # 1st call (Main)
            {'verified': True, 'faithfulness_score': 1.0, 'issues': []}   # 2nd call (Correction attempt 1)
        ]
        
        # Scorer: Also return low confidence to trigger correction if verification didn't
        self.mock_scorer.score.return_value = {'overall_confidence': 0.6, 'recommendation': 'REJECT'}
        
        # Generator: Returns "Fixed SQL" on second call
        self.mock_generator.generate.side_effect = ["Bad SQL", "Fixed SQL"]
        
        result = self.system.query_with_reflection("test query")
        
        assert result['correction_attempts'] == 1
        assert result['sql'] == "Fixed SQL"
