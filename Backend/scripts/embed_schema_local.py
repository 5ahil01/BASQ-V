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
        print("Loading Fake/Dummy embeddings model to isolate PyTorch freezing issues...")
        from langchain_core.embeddings import FakeEmbeddings
        embeddings = FakeEmbeddings(size=768)
        
        local_url = os.getenv("QDRANT_ENDPOINT_LOCAL") or "http://localhost:6333"
        print(f"Connecting to Local Qdrant at {local_url}...")
        
        # Verify connection
        client = QdrantClient(url=local_url, timeout=5)
        client.get_collections()
        
        collection_name = "sql_schema"
        print(f"Storing embeddings in Qdrant collection '{collection_name}'...")
        
        QdrantVectorStore.from_documents(
            documents=documents,
            embedding=embeddings,
            url=local_url,
            collection_name=collection_name,
            force_recreate=True
        )
        print("Schema successfully embedded and stored in LOCAL Qdrant!")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    embed_and_store_schema()
