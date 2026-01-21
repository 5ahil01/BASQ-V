import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

def test_api():
    url = "http://127.0.0.1:8000/query"
    
    # Needs to be a query relevant to the sales database
    questions = [
        "Show me all table names", 
        "Count the total number of records in the sales table" # adjusting based on expected tables
    ]
    
    for q in questions:
        print(f"\n-------------------------------------------------")
        print(f"Testing Question: {q}")
        payload = {"query": q}
        headers = {"Content-Type": "application/json"}
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                print("Success!")
                data = response.json()
                print(f"Generated SQL: {data.get('sql_query')}")
                print(f"Results: {data.get('result')}")
            else:
                print(f"Failed with status code: {response.status_code}")
                print(f"Error: {response.text}")
        except Exception as e:
             print(f"Request failed: {e}")

if __name__ == "__main__":
    print("Ensure the server is running on port 8000!")
    test_api()
