from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv

load_dotenv()

def get_qdrant_credentials():
    cloud_url = os.getenv("QDRANT_ENDPOINT_CLOUD")
    cloud_key = os.getenv("QDRANT_API_KEY")
    local_url = os.getenv("QDRANT_ENDPOINT_LOCAL")
    
    # Try cloud first
    if cloud_url and cloud_key:
        try:
            client = QdrantClient(url=cloud_url, api_key=cloud_key, timeout=5)
            client.get_collections()
            print("Successfully connected to Qdrant Cloud!")
            return cloud_url, cloud_key
        except Exception as e:
            print(f"Failed to connect to Qdrant Cloud: {e}. Falling back to local...")
            
    # Fallback to local
    if local_url:
        try:
            client = QdrantClient(url=local_url, timeout=5)
            client.get_collections()
            print("Successfully connected to Qdrant Local!")
            return local_url, None
        except Exception as e:
            print(f"Failed to connect to Qdrant Local: {e}")
            
    raise ConnectionError("Could not connect to Cloud or Local Qdrant. Check your .env configuration and Qdrant instances.")

def get_qdrant_client():
    url, api_key = get_qdrant_credentials()
    
    client_kwargs = {"url": url}
    if api_key:
        client_kwargs["api_key"] = api_key
        
    return QdrantClient(**client_kwargs)

# Optional: Initial connection test on module load or separate script
if __name__ == "__main__":
    try:
        client = get_qdrant_client()
        collections = client.get_collections()
        print("Successfully connected to Qdrant!")
        print(f"Collections: {collections}")
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
