from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv

load_dotenv()

QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_ENDPOINT = os.getenv("QDRANT_ENDPOINT")

def get_qdrant_client():
    if not QDRANT_ENDPOINT or not QDRANT_API_KEY:
        raise ValueError("QDRANT_ENDPOINT and QDRANT_API_KEY must be set in Environment Variables")
    
    return QdrantClient(
        url=QDRANT_ENDPOINT,
        api_key=QDRANT_API_KEY,
    )

# Optional: Initial connection test on module load or separate script
if __name__ == "__main__":
    try:
        client = get_qdrant_client()
        collections = client.get_collections()
        print("Successfully connected to Qdrant!")
        print(f"Collections: {collections}")
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
