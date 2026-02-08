from typing import List, Dict, Any, Tuple
import re

class HallucinationDetector:
    """
    Detects common LLM hallucinations in SQL queries.
    collaborates with SchemaValidator and SemanticValidator to identify:
    - Non-existent tables/columns
    - Made-up functions
    - Incorrect JOINs
    """
    
    def __init__(self, schema_validator=None):
        self.schema_validator = schema_validator
        
        # Standard SQL functions (PostgreSQL centric)
        self.standard_functions = {
            'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'CEILING', 'COS', 'COT', 'DEGREES', 'EXP', 'FLOOR', 'LN', 'LOG', 'MOD', 'PI', 'POWER', 'RADIANS', 'ROUND', 'SIGN', 'SIN', 'SQRT', 'TAN', 'TRUNC',
            'ASCII', 'BTRIM', 'CHR', 'CONCAT', 'CONCAT_WS', 'Format', 'INITCAP', 'LEFT', 'LENGTH', 'LOWER', 'LPAD', 'LTRIM', 'MD5', 'POSITION', 'REPEAT', 'REPLACE', 'REVERSE', 'RIGHT', 'RPAD', 'RTRIM', 'SPLIT_PART', 'STRPOS', 'SUBSTR', 'SUBSTRING', 'TO_ASCII', 'TO_HEX', 'TRANSLATE', 'TRIM', 'UPPER',
            'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'DATE_PART', 'DATE_TRUNC', 'EXTRACT', 'ISFINITE', 'JUSTIFY_DAYS', 'JUSTIFY_HOURS', 'JUSTIFY_INTERVAL', 'LOCALTIME', 'LOCALTIMESTAMP', 'NOW', 'TIMEOFDAY',
            'AVG', 'BIT_AND', 'BIT_OR', 'BOOL_AND', 'BOOL_OR', 'COUNT', 'EVERY', 'MAX', 'MIN', 'SUM',
            'COALESCE', 'NULLIF', 'GREATEST', 'LEAST', 'CAST', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'EXISTS', 'IN', 'ANY', 'ALL', 'SOME'
        }

    def check_functions(self, sql: str) -> List[Dict[str, Any]]:
        """
        Check for made-up functions.
        """
        issues = []
        # Regex to find function calls: word(
        # We need to be careful about matching keywords that look like functions but aren't
        # or valid functions not in our list.
        # This is a heuristic check.
        
        # Find all Words followed by (
        matches = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', sql)
        
        for func in matches:
             if func.upper() not in self.standard_functions:
                 # Check if it's likely a custom UDF or just a hallucination?
                 # For safety, we can flag it as "Unknown function" with medium severity.
                 # Many common functions might be missing from the list, so we treat it cautiously.
                 # But "CALCULATE_REVENUE" is definitely suspicious.
                 issues.append({
                     'type': 'unknown_function',
                     'severity': 'medium',
                     'details': f"Function '{func}' is not a standard SQL function.",
                     'suggestion': "Verify if this function exists in the database."
                 })
        return issues

    def analyze_schema_issues(self, schema_issues: List[str]) -> List[Dict[str, Any]]:
        """
        Convert raw schema issues into structured hallucination records.
        """
        hallucinations = []
        for issue in schema_issues:
            if "Table" in issue and "does not exist" in issue:
                table_name = re.search(r"Table '(.*?)'", issue)
                name = table_name.group(1) if table_name else "unknown"
                hallucinations.append({
                    'type': 'non_existent_table',
                    'severity': 'critical',
                    'details': issue,
                    'suggestion': f"Check schema for correct table name similar to '{name}'."
                })
            elif "Column" in issue and "does not exist" in issue:
                col_name = re.search(r"Column '(.*?)'", issue)
                name = col_name.group(1) if col_name else "unknown"
                hallucinations.append({
                    'type': 'non_existent_column',
                    'severity': 'critical',
                    'details': issue,
                    'suggestion': f"Check schema for correct column name similar to '{name}'."
                })
            else:
                 hallucinations.append({
                    'type': 'schema_error',
                    'severity': 'high',
                    'details': issue
                })
        return hallucinations

    def detect_all(self, sql: str, schema_issues: List[str]) -> List[Dict[str, Any]]:
        """
        Run all hallucination checks.
        """
        results = self.analyze_schema_issues(schema_issues)
        results.extend(self.check_functions(sql))
        return results
