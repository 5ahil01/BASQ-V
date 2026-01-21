from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from app.vector_db import get_qdrant_client
import os
from dotenv import load_dotenv

load_dotenv()

class RagService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
        self.client = get_qdrant_client()
        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name="sql_schema",
            embedding=self.embeddings,
        )
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_retries=3,
            api_key=os.getenv("GROQ_API_KEY")
        )
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 5})

    def generate_sql(self, query: str) -> str:
        template = """
        You are an expert PostgreSQL developer. Given the following database schema and a user question, write a syntactically correct PostgreSQL query.
        
        The query should be a SELECT statement to answer the question.
        Do NOT modify the database (no INSERT, UPDATE, DELETE, etc.).
        Do NOT include any markdown formatting (like ```sql ... ```). Just return the raw SQL.
        
        Schema Context:
        {context}
        
        User Question: {question}
        
        SQL Query:
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        
        chain = (
            {"context": self.retriever, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        sql_query = chain.invoke(query)
        
        # Cleanup: sometimes LLMs still output markdown
        cleaned_sql = sql_query.replace("```sql", "").replace("```", "").strip()
        
        return cleaned_sql
