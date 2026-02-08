import sqlparse
from typing import Tuple, Optional

class SyntaxChecker:
    """
    Validates SQL syntax using the sqlparse library.
    Checks if the SQL query can be parsed and has a valid structure.
    """
    
    def check(self, sql: str) -> Tuple[bool, Optional[str]]:
        """
        Check if the SQL syntax is valid.
        
        Args:
            sql: The SQL query string.
            
        Returns:
            Tuple containing:
            - bool: True if syntax is valid, False otherwise.
            - Optional[str]: Error message if invalid, None otherwise.
        """
        if not sql or not sql.strip():
            return False, "Empty SQL query"
            
        try:
            parsed = sqlparse.parse(sql)
            if not parsed:
                return False, "Failed to parse SQL"
            
            # Simple check: Ensure we have at least one statement
            statement = parsed[0]
            
            # Check for recognized statement type
            stmt_type = statement.get_type()
            if stmt_type == 'UNKNOWN':
                 # sqlparse might return UNKNOWN for some valid partial queries, 
                 # but for a full generated SQL, it should determine type (SELECT, INSERT, etc.)
                 # We'll flag it as potential syntax issue or just warn.
                 # For strict validation as per requirements, let's allow it but warn.
                 # However, usually non-SQL text is UNKNOWN.
                 
                 # Let's perform a keyword check as a secondary validation
                 first_token = statement.token_first()
                 if not first_token or first_token.ttype not in (sqlparse.tokens.DML, sqlparse.tokens.Keyword.DML):
                      return False, "Statement type unknown or invalid start of query"

            return True, None
            
        except Exception as e:
            return False, f"Syntax Error: {str(e)}"
