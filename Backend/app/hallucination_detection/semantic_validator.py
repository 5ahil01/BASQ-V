import re
import sqlparse
from typing import Tuple, List, Optional
from sqlparse.sql import IdentifierList, Identifier, Where, Comparison
from sqlparse.tokens import Keyword, DML

class SemanticValidator:
    """
    Validates SQL semantics for common logical errors like:
    - Aggregate functions used incorrectly (e.g. in WHERE clause)
    - Missing GROUP BY when aggregates are used
    - Logical inconsistencies
    """
    
    def validate(self, sql: str) -> Tuple[bool, List[str]]:
        """
        Validate the semantic logic of the SQL query.
        
        Args:
            sql: The SQL query string.
            
        Returns:
            Tuple containing:
            - bool: True if semantically valid, False otherwise.
            - List[str]: List of semantic issues found.
        """
        issues = []
        parsed = sqlparse.parse(sql)[0]
        
        # Check for aggregates in WHERE clause
        where_clause = None
        for token in parsed.tokens:
            if isinstance(token, Where):
                where_clause = token
                break
        
        # Check aggregates (SUM, AVG, COUNT, MAX, MIN) in WHERE
        if where_clause:
            where_str = str(where_clause)
            # Simple regex check inside where clause string
            agg_funcs = ['SUM(', 'AVG(', 'COUNT(', 'MAX(', 'MIN(']
            for agg in agg_funcs: 
                # Be careful to distinguish from simple strings matching
                if re.search(r'\b' + re.escape(agg), where_str, re.IGNORECASE):
                    issues.append("Aggregate function found in WHERE clause. Use HAVING instead.")
                    break
        
        # check GROUP BY logic
        # 1. Identify if aggregates are used in SELECT
        # 2. Identify non-aggregate columns in SELECT
        # 3. Check if GROUP BY exists and contains non-aggregate columns
        
        select_clause = []
        group_by_clause = []
        
        # Locate SELECT and GROUP BY parts
        # This is non-trivial with sqlparse flattened tokens, best to use token types
        
        # Identify if we have aggregate functions in SELECT
        has_aggregates = False
        select_stmt = False
        
        sql_upper = sql.upper()
        
        # Naive approach first: regex for aggregates in the whole query
        # But we specifically care about SELECT part vs GROUP BY part.
        
        # Let's extract the SELECT part string
        select_match = re.search(r'SELECT\s+(.*?)\s+(FROM|$)', sql, re.IGNORECASE | re.DOTALL)
        if select_match:
            select_part = select_match.group(1)
            # check for aggregates in SELECT
            if any(agg in select_part.upper() for agg in ['SUM(', 'AVG(', 'COUNT(', 'MAX(', 'MIN(']):
                has_aggregates = True
            
            # Simple check: if aggregate in select, and non-agg column in select, we need GROUP BY
            # Extract columns from SELECT
            # This requires robust parsing which is hard with regex or simple split
            # For this component, we can check a simpler rule:
            # If there is an aggregate, is there a GROUP BY?
            # Exception: SELECT COUNT(*) FROM table (no group by needed)
            # Exception: SELECT SUM(col) FROM table (no group by needed)
            # Exception: SELECT col, SUM(col2) FROM table -> NEEDS GROUP BY
            
            # Heuristic: If we have both aggregate AND a regular column in SELECT, we need GROUP BY
            # How to detect "regular column"?
            # Remove aggregates from string, see if any identifiers remain.
            
            clean_select = re.sub(r'SUM\(.*?\)|AVG\(.*?\)|COUNT\(.*?\)|MAX\(.*?\)|MIN\(.*?\)', '', select_part, flags=re.IGNORECASE)
            # Remove aliases "AS alias"
            clean_select = re.sub(r'\s+AS\s+\w+', '', clean_select, flags=re.IGNORECASE)
            # Remove simple constants/literals?
            # Check if any words remain that look like columns
            potential_cols = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', clean_select)
            # Filter out keywords like DISTINCT
            potential_cols = [p for p in potential_cols if p.upper() not in ('DISTINCT', 'ALL', '*')]
            
            has_regular_cols = len(potential_cols) > 0
            
            has_group_by = 'GROUP BY' in sql_upper
            
            if has_aggregates and has_regular_cols and not has_group_by:
                issues.append("Selects aggregate and non-aggregate columns but missing GROUP BY clause.")
                
        # Check for Logical order
        # e.g. HAVING without GROUP BY (valid in some SQL dialects but usually suspicious if no group by)
        if 'HAVING' in sql_upper and 'GROUP BY' not in sql_upper:
             # Actually standard SQL allows HAVING without GROUP BY (treats whole result as one group), 
             # but it's rare in business queries and often a mistake for "WHERE".
             # We'll flag it as potential issue or strict rule?
             # User prompt example: "Wrong aggregations (SUM in WHERE instead of HAVING)" implies strictness on WHERE vs HAVING
             pass # Let's stick to the high confidence errors
             
        return len(issues) == 0, issues
