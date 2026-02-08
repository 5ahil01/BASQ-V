import re
import sqlparse
from sqlparse.sql import IdentifierList, Identifier
from sqlparse.tokens import Keyword, DML
from typing import Dict, List, Tuple, Any

class SchemaValidator:
    """
    Validates SQL queries against a provided database schema.
    Checks if tables and columns exist in the schema.
    """
    
    def __init__(self, schema: Dict[str, List[str]]):
        """
        Initialize with the database schema.
        
        Args:
            schema: Dictionary mapping table names to list of column names.
                   Example: {'users': ['id', 'name', 'email'], 'orders': ['id', 'user_id', 'amount']}
        """
        self.schema = {k.lower(): [c.lower() for c in v] for k, v in schema.items()}

    def validate(self, sql: str) -> Tuple[bool, List[str]]:
        """
        Validate if the SQL query uses valid tables and columns from the schema.
        
        Args:
            sql: The SQL query string to validate.
            
        Returns:
            Tuple containing:
            - bool: True if valid, False otherwise.
            - List[str]: List of error messages if invalid.
        """
        issues = []
        try:
            # Extract tables and columns from SQL
            # Note: This is a simplified extraction and might need robust parsing for complex nested queries
            tables_in_sql = self._extract_tables(sql)
            columns_in_sql = self._extract_columns(sql)
            
            # Validate tables
            for table in tables_in_sql:
                if table.lower() not in self.schema:
                    issues.append(f"Table '{table}' does not exist in the schema.")
            
            # Validate columns (only if table is valid or if we can infer context)
            # In a simple implementation, we might just check if the column exists in ANY valid table 
            # or if it's qualified (table.column).
            # Here we'll check if column exists in the schema at all (in any of the tables present or generally)
            
            # Better approach: verify columns against the tables found
            # If no tables found (e.g. only SELECT 1), skip column validation? No, usually generated SQL has tables.
            
            valid_tables = [t.lower() for t in tables_in_sql if t.lower() in self.schema]
            
            if not valid_tables:
                 if tables_in_sql:
                     # All tables invalid, so columns likely invalid too, but we already reported tables.
                     pass
            else:
                # Gather all valid columns from the referenced tables
                valid_columns = set()
                for t in valid_tables:
                    valid_columns.update(self.schema[t])
                
                for col in columns_in_sql:
                    # Handle aliased columns or qualified columns (table.col)
                    col_name = col
                    if '.' in col:
                        parts = col.split('.')
                        t_alias = parts[0].lower()
                        c_name = parts[1].lower()
                        # If t_alias is a real table, check specific
                        if t_alias in self.schema:
                             if c_name not in self.schema[t_alias] and c_name != '*':
                                 issues.append(f"Column '{c_name}' does not exist in table '{t_alias}'.")
                        else:
                             # Should solve alias mapping, but for now assuming direct table usage or simple alias
                             # If alias not known, check if column exists in any used table
                             if c_name not in valid_columns and c_name != '*':
                                 issues.append(f"Column '{c_name}' does not exist in the schema.")
                    else:
                        if col.lower() not in valid_columns and col != '*':
                            issues.append(f"Column '{col}' does not exist in the schema (referenced tables: {', '.join(valid_tables)}).")

        except Exception as e:
            issues.append(f"Schema Validation Error: {str(e)}")
            
        return len(issues) == 0, issues
    
    def _extract_tables(self, sql: str) -> List[str]:
        """
        Extract table names from SQL using sqlparse.
        """
        tables = set()
        parsed = sqlparse.parse(sql)[0]
        from_seen = False
        
        for token in parsed.flatten():
            if token.ttype is Keyword and token.value.upper() == 'FROM':
                from_seen = True
                continue
            if token.ttype is Keyword and token.value.upper() in ('JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER'):
                continue 
            
            if from_seen:
                if token.ttype is Keyword and token.value.upper() in ('WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT'):
                     from_seen = False
                     continue
                
                # Simple extraction, handling "table" or "table alias"
                if token.ttype is None or token.is_group: # Identifier or IdentifierList
                    # This is tricky with flattened. Better to use non-flattened traversal or regex for simplicity
                    pass
        
        # Regex fallback for reliability in this specific task context where sqlparse can be complex 
        # to navigate for table extraction without a full visitor.
        # Looking for FROM <table> and JOIN <table>
        
        # Remove string literals to avoid matching inside strings
        sql_clean = re.sub(r"\'[^\']*\'", "", sql)
        
        # Regex for tables
        table_pattern = r'(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)'
        matches = re.findall(table_pattern, sql_clean, re.IGNORECASE)
        for m in matches:
             if m.upper() not in ('SELECT', 'WHERE', 'GROUP', 'ORDER', 'LIMIT', 'OFFSET', 'HAVING'):
                 tables.add(m)
                 
        return list(tables)

    def _extract_columns(self, sql: str) -> List[str]:
        """
        Extract column names from SELECT, WHERE, GROUP BY, HAVING, ORDER BY clauses.
        """
        columns = set()
        # Regex approach is often more robust for simple "column extraction" than trying to walk the complex parse tree
        # for a "quick" tool, unless we write a full visitor.
        # We need to ignore keywords.
        
        # Strategy: 
        # 1. Remove strings
        sql_clean = re.sub(r"\'[^\']*\'", "", sql)
        
        # 2. Extract potential identifiers
        # This is a heuristic. A robust solution needs full parsing.
        # Let's try to iterate tokens to find identifiers that are NOT keywords.
        
        # Using sqlparse to classify tokens
        parsed = sqlparse.parse(sql)[0]
        
        def extract_identifiers(token):
            if isinstance(token, IdentifierList):
                for identifier in token.get_identifiers():
                    extract_identifiers(identifier)
            elif isinstance(token, Identifier):
                # meaningful_name = token.get_real_name()
                name = token.get_real_name()
                if name:
                    columns.add(name)
            elif token.ttype is None and not token.is_group:
                 # Sometimes simple words come as None ttype if not keywords
                 pass
        
        # Walk the tree
        for token in parsed.tokens:
            if isinstance(token, IdentifierList):
                extract_identifiers(token)
            elif isinstance(token, Identifier):
                extract_identifiers(token)
            elif token.ttype is Keyword.DML and token.value.upper() == 'SELECT':
                continue
            
            # Also catch items in WHERE/GROUP BY
            # This requires recursive walking which is complex in single function.
            
        # Fallback/Hybrid: Regex for likely column usage
        # SELECT col1, col2 ...
        # WHERE col1 = ...
        # GROUP BY col1 ...
        
        # Let's rely on a simpler regex for now as per "simple rule-based"
        # Match words that are not keywords
        
        keywords = {'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'AS', 'JOIN', 'ON', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'ASC', 'DESC', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'}
        
        potential_cols = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', sql_clean)
        
        tables = self._extract_tables(sql)
        
        for word in potential_cols:
            if word.upper() not in keywords and word not in tables and not word.isdigit():
                # Exclude purely numeric strings (handled by isdigit, but regex handles it mostly)
                columns.add(word)
                
        return list(columns)
