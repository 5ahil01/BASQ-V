from app.main import self_reflective_rag

if __name__ == "__main__":
    result = self_reflective_rag.query_with_reflection("Show me all tablename")
    print(result)
