from typing import List, Dict, Any, Set
import re

class AnswerVerifier:
    """
    Verifies SQL answer against retrieved context.
    Detects hallucinations and unsupported claims.
    """
    
    def verify(self, sql: str, query: str, retrieved_chunks: List[str]) -> Dict:
        """
        Verify SQL faithfulness to retrieved context.
        
        Checks:
        1. Does SQL use only information from chunks?
        2. Are all SQL elements supported by context?
        3. Any hallucinated elements?
        
        Returns:
            {
                'verified': bool,
                'faithfulness_score': float (0-1),
                'issues': List[Dict],
                'unsupported_elements': List[str],
                'needs_correction': bool
            }
        """
        elements = self.extract_sql_elements(sql)
        unsupported = []
        issues = []
        
        # Check support for tables and columns
        for table in elements['tables']:
            if not self.check_context_support(table, retrieved_chunks):
                unsupported.append(f"Table: {table}")
                issues.append({'type': 'unsupported_table', 'value': table})
        
        for col in elements['columns']:
            # Skip wildcards and common aggregations if they are just syntax
            if col == '*' or col.upper() in ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN']:
                continue
            if not self.check_context_support(col, retrieved_chunks):
                unsupported.append(f"Column: {col}")
                issues.append({'type': 'unsupported_column', 'value': col})
                
        faithfulness = self.calculate_faithfulness(elements, unsupported)
        
        return {
            'verified': faithfulness >= 0.8 and not issues,
            'faithfulness_score': faithfulness,
            'issues': issues,
            'unsupported_elements': unsupported,
            'needs_correction': faithfulness < 0.8 or bool(issues)
        }
    
    def extract_sql_elements(self, sql: str) -> Dict[str, List[str]]:
        """
        Extract key elements from SQL using regex.
        Simple parser for demonstration.
        """
        sql = sql.upper()
        
        # Extract FROM tables
        # Matches: FROM table1, JOIN table2
        tables = re.findall(r'FROM\s+([a-zA-Z0-9_]+)|JOIN\s+([a-zA-Z0-9_]+)', sql)
        # Flatten and filter None
        tables_flat = [t for group in tables for t in group if t]
        
        # Extract SELECT columns
        # This is tricky without a parser.
        # We'll look for words between SELECT and FROM
        select_part = re.search(r'SELECT\s+(.+?)\s+FROM', sql, re.DOTALL)
        columns = []
        if select_part:
            cols_str = select_part.group(1)
            # Split by comma, strip, and extract word
            # Handle "t.col" or "col AS alias" or "SUM(col)"
            raw_cols = [c.strip() for c in cols_str.split(',')]
            for rc in raw_cols:
                # Remove aggregation functions
                clean = re.sub(r'(SUM|AVG|COUNT|MAX|MIN)\((.+?)\)', r'\2', rc)
                # Remove AS alias
                clean = re.split(r'\s+AS\s+', clean)[0]
                # Remove distinct
                clean = clean.replace('DISTINCT ', '')
                # Remove table prefix
                if '.' in clean:
                    clean = clean.split('.')[-1]
                columns.append(clean.strip())
                
        # Also Extract WHERE columns
        where_part = re.search(r'WHERE\s+(.+?)($|GROUP|ORDER|LIMIT)', sql, re.DOTALL)
        if where_part:
            where_str = where_part.group(1)
            # Find words that look like columns (simple heuristic)
            # Avoid operators and values
            # This is very basic.
            potential_cols = re.findall(r'([a-zA-Z0-9_]+)\s*[=<>!]', where_str)
            columns.extend(potential_cols)
            
        return {
            'tables': list(set(tables_flat)),
            'columns': list(set(columns)), # Unique
            'filters': [], # TODO: Extract filters if needed
            'aggregations': []
        }
    
    def check_context_support(self, element: str, chunks: List[str]) -> bool:
        """
        Check if element is mentioned in any chunk.
        Case-insensitive substring match.
        """
        if self.is_system_element(element):
            return True
            
        element_lower = element.lower()
        for chunk in chunks:
            if element_lower in chunk.lower():
                return True
        return False

    def is_system_element(self, element: str) -> bool:
        """
        Check if element is a known system table or column.
        """
        system_tables = {
            'pg_catalog', 'pg_tables', 'pg_class', 'pg_namespace', 
            'pg_attribute', 'pg_index', 'pg_proc', 'pg_type',
            'information_schema', 'columns', 'tables', 'schemata'
        }
        system_columns = {
            'tablename', 'schemaname', 'tableowner', 'tablespace',
            'hasindexes', 'hasrules', 'hastriggers', 'rowsecurity',
            'table_name', 'column_name', 'data_type', 'is_nullable'
        }
        
        return element.lower() in system_tables or element.lower() in system_columns
    
    def calculate_faithfulness(self, elements: Dict, unsupported: List[str]) -> float:
        """
        Calculate faithfulness score.
        faithfulness = supported_elements / total_elements
        """
        total_items = len(elements['tables']) + len(elements['columns'])
        if total_items == 0:
            return 1.0 # Empty SQL?
            
        supported_count = total_items - len(unsupported)
        return supported_count / total_items
