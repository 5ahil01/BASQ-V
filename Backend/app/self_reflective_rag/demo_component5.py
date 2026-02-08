import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.self_reflective_rag.self_reflective_rag import SelfReflectiveRAG
from app.self_reflective_rag.integration_helpers import load_component1, load_component4, create_sql_generator

# Mock components for demonstration if real ones are not available
class MockBusinessRAG:
    def retrieve_context(self, query: str, k: int = 3):
        print(f"  [MockRAG] Retrieving {k} chunks for: '{query}'")
        # Simulate different retrieval quality based on query keywords
        if "revenue" in query.lower():
            if k < 5:
                # Initial retrieval: barely adequate
                return ["Revenue for 2023 was approx 1M.", "Sales team targets met."]
            else:
                # Expanded retrieval: better
                return [
                    "Revenue for 2023 was approx 1M.", "Sales team targets met.",
                    "Q1 Revenue: 200k.", "Q2 Revenue: 250k.", "Q3 Revenue: 300k, Q4: 250k."
                ]
        elif "hallucination" in query.lower():
            return ["We only sell Apples and Bananas.", "Prices are fixed."]
        return ["Generic business context chunk 1", "Generic business context chunk 2"]

class MockConfidenceScorer:
    def score(self, sql: str, query: str, chunks: List[str]):
        print(f"  [MockScorer] Scoring SQL: {sql}")
        if "hallucinated_column" in sql:
            return {'overall_confidence': 0.2, 'recommendation': 'REJECT'}
        return {'overall_confidence': 0.95, 'recommendation': 'EXECUTE'}

class MockSQLGenerator:
    def generate(self, query: str, chunks: List[str]):
        print(f"  [MockGen] Generating SQL...")
        if "hallucination" in query.lower():
            return "SELECT hallucinated_column FROM products"
        return "SELECT SUM(revenue) FROM financial_data WHERE year = 2023"

def main():
    print("Initializing Self-Reflective RAG (Component 5)...")
    
    # improved loading logic
    business_rag = load_component1() or MockBusinessRAG()
    confidence_scorer = load_component4() or MockConfidenceScorer()
    sql_generator = create_sql_generator() or MockSQLGenerator()
    
    rag_system = SelfReflectiveRAG(business_rag, confidence_scorer, sql_generator)
    
    print("\n" + "="*80)
    print("TEST CASE 1: Simple Query (Should converge quickly)")
    print("="*80)
    result = rag_system.query_with_reflection("Show total revenue for 2023")
    print("\nResult Status:", result['status'])
    print("Retrieval Iterations:", result['retrieval_iterations'])
    
    print("\n" + "="*80)
    print("TEST CASE 3: Query with Hallucination (Should trigger self-correction)")
    print("="*80)
    # The Mock components are set up to trigger failure for "hallucination" query
    result = rag_system.query_with_reflection("Show me the hallucination test")
    print("\nResult Status:", result['status'])
    print("Correction Attempts:", result['correction_attempts'])
    if result['correction_attempts'] > 0:
        print("[OK] Self-Correction Triggered Successfully!")
        
    print("\n" + "="*80)
    print("DEMO COMPLETE")

if __name__ == "__main__":
    from typing import List # Fix for mock signature
    main()
