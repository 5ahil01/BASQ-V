import os
from sqlalchemy import inspect
from database import engine
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document
from vector_db import get_qdrant_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_schema_documents():
    """
    Connects to the database, inspects the schema, and returns a list of LangChain Documents.
    Each document represents a table's schema.
    """
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    documents = []
    
    print(f"Found tables: {table_names}")
    
    for table_name in table_names:
        columns = inspector.get_columns(table_name)
        pk_constraint = inspector.get_pk_constraint(table_name)
        foreign_keys = inspector.get_foreign_keys(table_name)
        
        # Build a text representation of the table schema
        schema_text = f"Table: {table_name}\n"
        schema_text += "Columns:\n"
        for col in columns:
            col_info = f"  - {col['name']} ({col['type']})"
            if col.get('primary_key'): # Note: get_columns might not always return pk info directly depending on dialect, checking pk_constraint is safer usually but this is often usually populated
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
        
        # Create a document for this table
        doc = Document(
            page_content=schema_text,
            metadata={"table_name": table_name, "type": "sql_schema"}
        )
        documents.append(doc)
        
    return documents

def embed_and_store_schema():
    """
    Embeds the schema documents and stores them in Qdrant.
    """
    try:
        documents = get_schema_documents()
        if not documents:
            print("No tables found to embed.")
            return

        print(f"Prepared {len(documents)} documents for embedding.")
        
        # Initialize Embeddings
        # Using a standard, high-quality local model
        print("Loading HuggingFace embeddings model...")
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
        
        # Initialize Qdrant Client
        client = get_qdrant_client()
        
        collection_name = "sql_schema"
        
        print(f"Storing embeddings in Qdrant collection '{collection_name}'...")
        
        # Create Vector Store
        # This will create the collection if it doesn't exist and add documents
        QdrantVectorStore.from_documents(
            documents=documents,
            embedding=embeddings,
            url=os.getenv("QDRANT_ENDPOINT"),
            api_key=os.getenv("QDRANT_API_KEY"),
            collection_name=collection_name,
            force_recreate=True # Optional: Set to True if you want to overwrite the schema collection each time
        )
        
        print("Schema successfully embedded and stored in Qdrant!")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    embed_and_store_schema()
