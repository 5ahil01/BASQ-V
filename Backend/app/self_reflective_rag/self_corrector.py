from typing import List, Dict, Any, Optional
import time

class SelfCorrector:
    """
    Attempts to correct SQL when verification fails.
    """
    
    def __init__(self, adaptive_retriever: Any, sql_generator: Any, answer_verifier: Any):
        self.retriever = adaptive_retriever
        self.generator = sql_generator
        self.verifier = answer_verifier
        self.max_correction_attempts = 3
    
    def correct(self, sql: str, user_query: str, issues: List[Dict], 
                current_chunks: List[str]) -> Dict:
        """
        Self-correction loop.
        
        Algorithm:
        1. Identify what information is missing
        2. Retrieve additional specific context
        3. Regenerate SQL with enhanced context
        4. Verify again
        5. Repeat if needed (max 3 times)
        
        Returns:
            {
                'success': bool,
                'corrected_sql': Optional[str],
                'attempts': int,
                'final_verification': Dict,
                'correction_log': List[Dict]
            }
        """
        correction_log = []
        current_sql = sql
        
        for attempt in range(self.max_correction_attempts):
            print(f"Correction Attempt {attempt+1}/{self.max_correction_attempts}")
            
            # 1. Identify missing info from issues
            missing_info_queries = []
            for issue in issues:
                if issue['type'] == 'unsupported_table':
                    missing_info_queries.append(f"What is the correct table for {issue['value']}?")
                elif issue['type'] == 'unsupported_column':
                    missing_info_queries.append(f"What is the correct column for {issue['value']}?")
            
            # If no specific queries, just use original query again?
            if not missing_info_queries:
                missing_info_queries = [user_query]
                
            # 2. Retrieve additional context
            # We use the retriever but maybe with specific queries?
            # Creating a "repair" retrieval strategy.
            # Ideally we'd call self.retriever.retrieve_specific(missing_info_queries)
            # But we only have retrieve_adaptively(user_query).
            # Let's assume we can ask business_rag directly for these specifics
            # Or just append them to user query for a new flexible retrieval?
            
            # For simplicity, let's treat it as "Retrieve more related to these missing terms"
            additional_chunks = []
            for mq in missing_info_queries:
                # We reuse the business_rag inside adaptive_retriever
                try:
                    # Just get top 1 for specific fix
                    chunks = self.retriever.business_rag.retrieve_context(mq, k=1)
                    additional_chunks.extend(chunks)
                except:
                    pass
            
            # Merge with current chunks
            # In a real system we'd be careful not to pollute context, but here we add.
            enhanced_chunks = list(set(current_chunks + additional_chunks))
            current_chunks = enhanced_chunks # Update current context for next iteration
            
            # 3. Regenerate SQL
            # We need to tell the generator "Previous SQL was X, issues were Y, please fix".
            # If the generator API is just generate(query, context), we might be limited.
            # Assuming generator has a method for correction or we construct a new prompt.
            # For this implementation, we'll assume we pass the User Query again with BETTER context.
            # Ideally: prompt = f"Query: {user_query}. Previous attempt failed: {issues}. Fix it."
            
            # Using standard generation interface for now as per "Component 1" / "SQL Generator" stub
            # but modifying the prompt implicitly by providing better chunks?
            # Or maybe we need to mock the generator's ability to take feedback.
            
            # Let's try to call generate with the enhanced context.
            # If the generator is smart, it will use the new chunks to find the right table.
            try:
                new_sql = self.generator.generate(user_query, enhanced_chunks)
            except:
                new_sql = current_sql # Fallback
                
            # 4. Verify again
            verification = self.verifier.verify(new_sql, user_query, enhanced_chunks)
            
            correction_log.append({
                'attempt': attempt + 1,
                'issues_addressed': [i['value'] for i in issues],
                'new_sql': new_sql,
                'verification': verification
            })
            
            if verification['verified']:
                return {
                    'success': True,
                    'corrected_sql': new_sql,
                    'attempts': attempt + 1,
                    'final_verification': verification,
                    'correction_log': correction_log
                }
            
            # Update for next loop
            current_sql = new_sql
            issues = verification['issues']
            
        return {
            'success': False,
            'corrected_sql': current_sql, # Best effort
            'attempts': self.max_correction_attempts,
            'final_verification': verification, # Last one
            'correction_log': correction_log
        }
