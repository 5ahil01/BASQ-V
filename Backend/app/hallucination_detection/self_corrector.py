from typing import List, Dict, Optional
import re

class SQLSelfCorrector:
    """
    Attempts to fix low-confidence SQL queries based on detected issues.
    Uses rule-based corrections for common errors like:
    - Wrong table/column names (if suggestion provided)
    - Aggregates in WHERE clause (moves to HAVING)
    """
    
    def correct(self, sql: str, issues: List[Dict[str, Any]]) -> Optional[str]:
        """
        Apply corrections to the SQL query.
        
        Args:
            sql: The original SQL query.
            issues: List of issues detected by validators.
            
        Returns:
            str: The corrected SQL query, or original if no fixes applicable.
        """
        corrected_sql = sql
        
        # Sort issues by severity? Critical first.
        # But replacements might conflict. 
        # Detailed implementation would be complex. 
        # We'll do sequential processing of simple fixes.
        
        for issue in issues:
            suggestion = issue.get('suggestion')
            details = issue.get('details')
            issue_type = issue.get('type')
            
            if not suggestion and not issue_type:
                continue
                
            # 1. Hallucination Fixes (Table/Column swaps)
            if issue_type == 'non_existent_table' or issue_type == 'non_existent_column':
                # content of suggestion often: "Use 'correct_name' table" or "Use 'col'"
                # We need to extract the target name.
                # Heuristic: extract quoted string from suggestion.
                match = re.search(r"'([^']*)'", suggestion)
                if match:
                    correct_term = match.group(1)
                    # identifying what to replace is harder.
                    # details: "Table 'old' does not exist"
                    wrong_term_match = re.search(r"Table '([^']*)'", details) or re.search(r"Column '([^']*)'", details)
                    if wrong_term_match:
                        wrong_term = wrong_term_match.group(1)
                        # Perform replacement
                        # Use word boundaries to avoid partial replacement
                        corrected_sql = re.sub(r'\b' + re.escape(wrong_term) + r'\b', correct_term, corrected_sql)
            
            # 2. Semantic Fixes (Aggregate in WHERE -> HAVING)
            elif issue_type == 'aggregate_in_where':
                # Try to move WHERE clause content to HAVING if it contains aggregates.
                # Pattern: WHERE <condition_with_agg> GROUP BY <cols>
                # Target: GROUP BY <cols> HAVING <condition_with_agg>
                
                # Regex to capture WHERE ... GROUP BY ...
                # This handles the case where WHERE is immediately followed by GROUP BY
                pattern = re.compile(r'WHERE\s+(.*?)\s+GROUP\s+BY\s+(.*?)(?:\s+(?:ORDER|LIMIT)|$)', re.IGNORECASE | re.DOTALL)
                match = pattern.search(corrected_sql)
                
                if match:
                    condition = match.group(1)
                    group_cols = match.group(2)
                    
                    # Check if condition has aggregate
                    if any(agg in condition.upper() for agg in ['SUM(', 'AVG(', 'COUNT(', 'MAX(', 'MIN(']):
                        # Construct new segment
                        new_segment = f"GROUP BY {group_cols} HAVING {condition}"
                        # Replace the old segment
                        corrected_sql = corrected_sql.replace(match.group(0), new_segment)
                else: 
                     # Case without GROUP BY, or WHERE at end
                     # If essentially "SELECT ... FROM ... WHERE SUM(x)>10"
                     # Change WHERE to HAVING? (only if implicit group by allowed or empty group)
                     # But usually needs GROUP BY.
                     pass 

        return corrected_sql if corrected_sql != sql else None
