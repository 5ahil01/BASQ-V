import sys
import os
from dotenv import load_dotenv

load_dotenv("Backend/.env")
sys.path.append(os.path.abspath("Backend"))

from app.self_reflective_rag.self_reflective_rag import SelfReflectiveRAG
from app.self_reflective_rag.integration_helpers import load_component1, load_component4, create_sql_generator

def debug_run():
    print("Loading components...")
    business_rag = load_component1()
    confidence_scorer = load_component4()
    sql_generator = create_sql_generator()
    
    if not business_rag or not confidence_scorer or not sql_generator:
        print("Failed to load components.")
        return

    print("Components loaded. Initializing system...")
    rag_system = SelfReflectiveRAG(business_rag, confidence_scorer, sql_generator)
    
    query = "Show me total sales by region"
    print(f"Running query: {query}")
    
    result = rag_system.query_with_reflection(query)
    print("Query complete.")
    print(f"Result Status: {result.get('status')}")
    print(f"SQL: {result.get('sql')}")
    print(f"Confidence: {result.get('sql_confidence')}")

if __name__ == "__main__":
    debug_run()
