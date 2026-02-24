
try:
    import sqlparse
    print("SUCCESS: Imported sqlparse")
except ImportError as e:
    print(f"FAILURE: Could not import sqlparse. Error: {e}")

try:
    import langchain_huggingface
    print("SUCCESS: Imported langchain_huggingface")
except ImportError as e:
    print(f"FAILURE: Could not import langchain_huggingface. Error: {e}")
