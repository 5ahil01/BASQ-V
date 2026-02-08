import re
from typing import List, Tuple

class ContextChecker:
    """
    Validates if the generated SQL aligns with the retrieved business context.
    Checks if key terms from the context appear in the SQL query.
    """
    
    def validate(self, sql: str, context: List[str]) -> float:
        """
        Calculate a context alignment score based on term overlap.
        
        Args:
            sql: The generated SQL query.
            context: List of strings representing business context rules or definitions.
            
        Returns:
            float: Alignment score between 0.0 and 1.0.
        """
        if not context:
            return 0.5 # Neutral if no context provided, or maybe 1.0? 
                       # Usually if context is empty, no constraints to violate. 
                       # But prompt implies we validate against *retrieved* context.
                       # Let's say 1.0 if no context to check against.
            return 1.0

        # Extract potential terms from context
        # Heuristic: limit to nouns/identifiers, ignore common stopwords.
        # However, context strings might be "Revenue = net_revenue column".
        # Terms: "Revenue", "net_revenue", "column".
        # We care about SQL matching relevant terms like "net_revenue".
        
        # Better approach: Extract terms that look like column/table names or values from context
        # and check if they appear in SQL.
        
        context_terms = set()
        for item in context:
            # simple tokenization
            terms = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', item)
            # Filter out common English words if possible, or just accept specified terms
            # The prompt example: Context=["Revenue = net_revenue column", "Use fiscal_year"]
            # SQL uses "net_revenue", "fiscal_year".
            # We want to capture "net_revenue", "fiscal_year".
            # We probably also capture "Revenue", "column", "Use", "queries".
            # But "Use", "queries", "column" are generic.
            
            # Refined Heuristic: Context often specifies mappings "A -> B". 
            # We want to check if B is in SQL.
            # But we can't easily parse A->B without NLP.
            # So let's stick to "significant terms overlap".
            # Significant terms: words > 3 chars?
            for term in terms:
                if len(term) > 3 and term.lower() not in ('check', 'use', 'for', 'with', 'from', 'where', 'select', 'group', 'order', 'having', 'revenue', 'column', 'table', 'query', 'queries'):
                    context_terms.add(term.lower())
        
        if not context_terms:
             return 1.0
             
        # Check presence in SQL
        sql_lower = sql.lower()
        matches = 0
        for term in context_terms:
            if term in sql_lower:
                matches += 1
                
        # Calculate score
        # If any context term is found? Or percentage of context terms found?
        # "ignored context (should use net_revenue, fiscal_year)" -> implies we need to find specific terms.
        # But we don't know WHICH terms are mandatory.
        # Let's use percentage of *provided context items* that have at least one term matched in SQL?
        # Or just term overlap ratio.
        
        # Let's try: fraction of context *statements* that are "addressed" (have a term match).
        # Example: 
        # C1: "Revenue = net_revenue" -> matched "net_revenue" -> C1 satisfied.
        # C2: "Use fiscal_year" -> matched "fiscal_year" -> C2 satisfied.
        
        satisfied_context_items = 0
        for item in context:
            item_terms = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', item.lower())
            # filter generic
            significant_terms = [t for t in item_terms if len(t) > 3 and t not in ('check', 'use', 'for', 'with', 'from', 'where', 'select', 'group', 'order', 'having', 'revenue', 'column', 'table', 'query', 'queries', 'clause')]
            
            if not significant_terms:
                satisfied_context_items += 1 # Assume satisfied if no specific terms
            else:
                if any(t in sql_lower for t in significant_terms):
                    satisfied_context_items += 1
                    
        return satisfied_context_items / len(context)
