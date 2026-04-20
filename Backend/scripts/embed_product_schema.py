import os
from sqlalchemy import inspect
from app.database import engine
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document
from qdrant_client import QdrantClient
from dotenv import load_dotenv

load_dotenv()

def get_schema_documents():
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    documents = []
    print(f"Found tables: {table_names}")
    for table_name in table_names:
        columns = inspector.get_columns(table_name)
        pk_constraint = inspector.get_pk_constraint(table_name)
        foreign_keys = inspector.get_foreign_keys(table_name)
        
        schema_text = f"Table: {table_name}\nColumns:\n"
        for col in columns:
            col_info = f"  - {col['name']} ({col['type']})"
            if col.get('primary_key'):
                col_info += " [PK]"
            if col.get('nullable'):
                col_info += " NULL"
            else:
                col_info += " NOT NULL"
            schema_text += f"{col_info}\n"
            
        if pk_constraint and pk_constraint.get('constrained_columns'):
             schema_text += f"Primary Key: {', '.join(pk_constraint['constrained_columns'])}\n"

        if foreign_keys:
            schema_text += "Foreign Keys:\n"
            for fk in foreign_keys:
                schema_text += f"  - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}\n"
        
        doc = Document(page_content=schema_text, metadata={"table_name": table_name, "type": "sql_schema"})
        documents.append(doc)
    return documents

def embed_and_store_schema():
    try:
        documents = get_schema_documents()
        if not documents:
            print("No tables found to embed.")
            return

        print(f"Prepared {len(documents)} documents for embedding.")
        
        print("Loading HuggingFace embeddings model...")
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
        
        from app.vector_db import get_qdrant_credentials
        qdrant_url, qdrant_api_key = get_qdrant_credentials()
        print(f"Connecting to Qdrant at {qdrant_url}...")
        
        # Verify connection
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key, timeout=5)
        client.get_collections()
        
        collection_name = "product_schema"
        print(f"Storing embeddings in Qdrant collection '{collection_name}'...")
        
        QdrantVectorStore.from_documents(
            documents=documents, # type: ignore
            embedding=embeddings,
            url=qdrant_url,
            api_key=qdrant_api_key,
            collection_name=collection_name,
            force_recreate=True
        )
        print(f"Schema successfully embedded and stored in LOCAL Qdrant! Collection: {collection_name}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    embed_and_store_schema()
