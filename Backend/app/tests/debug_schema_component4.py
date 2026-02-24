import sys
import os

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.hallucination_detection.schema_validator import SchemaValidator

def test_schema_validator():
    print("Testing SchemaValidator with system tables...")
    
    # Empty business schema
    validator = SchemaValidator({})
    
    # Test query
    sql = "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    
    print(f"Validating SQL: {sql}")
    is_valid, issues = validator.validate(sql)
    
    print(f"Is Valid: {is_valid}")
    print(f"Issues: {issues}")
    
    if is_valid:
        print("SUCCESS: System table whitelisting passed.")
    else:
        print("FAILURE: System table whitelisting failed.")

if __name__ == "__main__":
    test_schema_validator()
