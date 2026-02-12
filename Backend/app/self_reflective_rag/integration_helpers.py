from typing import List, Dict, Any
import os
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Import existing components
try:
    from app.services.rag_service import RagService
    from app.hallucination_detection.confidence_scorer import SQLConfidenceScorer
    from app.prompts import SQL_GENERATION_TEMPLATE
except ImportError as e:
    # Fallback for testing environment where 'app' might not be root
    print(f"Warning: Could not import existing components directly. Error: {e}")
    print("Using mocks or relative imports if available.")
    RagService = None
    SQLConfidenceScorer = None
    SQL_GENERATION_TEMPLATE = ""

class BusinessRAGWrapper:
    """Adapts RagService to provide direct retrieval access."""
    def __init__(self, rag_service):
        self.service = rag_service
    
    def retrieve_context(self, query: str, k: int = 3) -> List[str]:
        """Retrieve k chunks."""
        # RagService has self.retriever which is likely a VectorStoreRetriever
        # We need to adjust k dynamically.
        # Most langchain retrievers allow passing search_kwargs in invoke, 
        # but vector_store.as_retriever() creates a retriever with fixed kwargs.
        # We can access the vectorstore directly if exposed.
        
        if hasattr(self.service, 'vector_store'):
            docs = self.service.vector_store.similarity_search(query, k=k)
            return [doc.page_content for doc in docs]
        elif hasattr(self.service, 'retriever'):
            # Fallback to fixed k retriever if vector_store not accessible
            docs = self.service.retriever.invoke(query)
            return [doc.page_content for doc in docs]
        return []

class ConfidenceScorerWrapper:
    """Adapts SQLConfidenceScorer to expected interface."""
    def __init__(self, scorer):
        self.scorer = scorer
        
    def score(self, sql: str, query: str, chunks: List[str]) -> Dict:
        """Score the SQL."""
        # SQLConfidenceScorer.evaluate(sql, context)
        return self.scorer.evaluate(sql, context=chunks)

class SQLGeneratorWrapper:
    """Custom generator using RagService's LLM but external context."""
    def __init__(self, rag_service):
        self.llm = rag_service.llm
        # We need a prompt that accepts 'context' and 'question'
        # RagService uses SQL_GENERATION_TEMPLATE
        if SQL_GENERATION_TEMPLATE:
            self.prompt = ChatPromptTemplate.from_template(SQL_GENERATION_TEMPLATE)
        else:
            self.prompt = ChatPromptTemplate.from_template(
                "Based on the context provided, answer the question: {question}\nContext: {context}"
            )
            
    def generate(self, query: str, chunks: List[str]) -> str:
        """Generate SQL using provided chunks."""
        context_str = "\n\n".join(chunks)
        
        chain = (
            self.prompt
            | self.llm
            | StrOutputParser()
        )
        
        try:
            response = chain.invoke({"context": context_str, "question": query})
            # Clean up cleanup
            cleaned = response.replace("```sql", "").replace("```", "").strip()
            return cleaned
        except Exception as e:
            print(f"Generation error: {e}")
            return "-- Error generating SQL"

def load_component1():
    """Load Business RAG"""
    if RagService:
        service = RagService()
        return BusinessRAGWrapper(service)
    return None

def load_component4(schema: Dict[str, List[str]] = None):
    """Load Confidence Scorer"""
    if SQLConfidenceScorer:
        if schema is None:
            # TODO: Load actual schema from database or models
            schema = {"default": ["id", "name"]} 
        scorer = SQLConfidenceScorer(schema)
        return ConfidenceScorerWrapper(scorer)
    return None

def create_sql_generator():
    """Create SQL generator"""
    if RagService:
        service = RagService() # Or reuse instance
        return SQLGeneratorWrapper(service)
    return None
