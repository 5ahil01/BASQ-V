import os
from langchain_qdrant import QdrantVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from vector_db import get_qdrant_client
from dotenv import load_dotenv

load_dotenv()

def verify_embedding():
    try:
        print("Loading embeddings model...")
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
        
        client = get_qdrant_client()
        collection_name = "sql_schema"
        
        print(f"Connecting to Qdrant collection '{collection_name}'...")
        vector_store = QdrantVectorStore(
            client=client,
            collection_name=collection_name,
            embedding=embeddings,
        )
        
        query = "sales table schema"
        print(f"Querying for: '{query}'")
        
        results = vector_store.similarity_search(query, k=1)
        
        if results:
            print("\nFound result:")
            print(f"Content: {results[0].page_content}")
            print(f"Metadata: {results[0].metadata}")
        else:
            print("\nNo results found.")
            
    except Exception as e:
        print(f"Verification failed: {e}")

if __name__ == "__main__":
    verify_embedding()
