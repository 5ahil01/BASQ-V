from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv

load_dotenv()

local_url = os.getenv("QDRANT_ENDPOINT_LOCAL")
if not local_url:
    print("No")
    print("Local URL not set in .env")
    exit(1)

try:
    client = QdrantClient(url=local_url, timeout=5)
    collections = client.get_collections()
    if collections.collections:
        print("Yes")
        for collection in collections.collections:
            print(f" - {collection.name}")
    else:
        print("No")
except Exception as e:
    print("No")
    print(f"Error connecting: {e}")
