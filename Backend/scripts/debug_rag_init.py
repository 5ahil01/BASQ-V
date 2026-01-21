print("Starting debug script...")
import os
from dotenv import load_dotenv

load_dotenv()

try:
    print("Importing libs...")
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_qdrant import QdrantVectorStore
    from langchain_google_genai import ChatGoogleGenerativeAI
    from app.vector_db import get_qdrant_client
    
    print("Initializing Embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
    print("Embeddings initialized.")
    
    print("Getting Qdrant Client...")
    client = get_qdrant_client()
    print("Qdrant Client initialized.")
    
    print("Initializing Vector Store...")
    vector_store = QdrantVectorStore(
        client=client,
        collection_name="sql_schema",
        embedding=embeddings,
    )
    print("Vector Store initialized.")
    
    print("Initializing LLM...")
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        temperature=0,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    print("LLM initialized.")
    
    print("ALL DONE.")
except Exception as e:
    print(f"Error: {e}")
