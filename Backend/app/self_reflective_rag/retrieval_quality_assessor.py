from typing import List, Dict, Set
import re

class RetrievalQualityAssessor:
    """
    Assesses quality of retrieved business context.
    This is NOVEL - doesn't exist in current RAG systems.
    """
    
    def assess(self, query: str, retrieved_chunks: List[str]) -> Dict:
        """
        Multi-dimensional quality assessment
        
        Args:
            query: User's query
            retrieved_chunks: Documents retrieved from Component 1
        
        Returns:
            {
                'overall_confidence': float (0-1),
                'dimension_scores': {
                    'relevance': float,      # Semantic similarity
                    'coverage': float,       # Query aspects covered
                    'coherence': float,      # Chunks consistency
                    'sufficiency': float     # Enough to answer?
                },
                'needs_more_retrieval': bool,
                'assessment_reasoning': str
            }
        """
        if not retrieved_chunks:
            return {
                'overall_confidence': 0.0,
                'dimension_scores': {
                    'relevance': 0.0,
                    'coverage': 0.0,
                    'coherence': 0.0,
                    'sufficiency': 0.0
                },
                'needs_more_retrieval': True,
                'assessment_reasoning': "No chunks retrieved."
            }

        relevance = self.calculate_relevance(query, retrieved_chunks)
        coverage = self.calculate_coverage(query, retrieved_chunks)
        coherence = self.calculate_coherence(retrieved_chunks)
        sufficiency = self.calculate_sufficiency(query, retrieved_chunks)
        
        # Scoring Formula
        overall_confidence = (
            relevance   * 0.35 +  # Most important
            coverage    * 0.30 +  # Critical
            coherence   * 0.20 +  # Important
            sufficiency * 0.15    # Helpful
        )
        
        needs_more = overall_confidence < 0.70
        
        reasoning = []
        if relevance < 0.5: reasoning.append("Low relevance")
        if coverage < 0.5: reasoning.append("Missing key aspects")
        if coherence < 0.5: reasoning.append("Conflicting info")
        if sufficiency < 0.5: reasoning.append("Insufficient info")
        
        return {
            'overall_confidence': round(overall_confidence, 2),
            'dimension_scores': {
                'relevance': round(relevance, 2),
                'coverage': round(coverage, 2),
                'coherence': round(coherence, 2),
                'sufficiency': round(sufficiency, 2)
            },
            'needs_more_retrieval': needs_more,
            'assessment_reasoning': ", ".join(reasoning) if reasoning else "Good quality retrieval"
        }
    
    def calculate_relevance(self, query: str, chunks: List[str]) -> float:
        """
        Calculate average semantic relevance using term overlap.
        Returns: 0.0 to 1.0
        """
        query_terms = set(re.findall(r'\w+', query.lower()))
        if not query_terms:
            return 0.0
        
        relevance_scores = []
        for chunk in chunks:
            chunk_terms = set(re.findall(r'\w+', chunk.lower()))
            if not chunk_terms:
                relevance_scores.append(0.0)
                continue
            overlap = len(query_terms & chunk_terms) / len(query_terms)
            relevance_scores.append(overlap)
        
        return sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0.0
    
    def calculate_coverage(self, query: str, chunks: List[str]) -> float:
        """
        Check if chunks cover all query aspects.
        """
        # Simple extraction of "aspects" as nouns or key terms could be complex.
        # Here we treat unique significant words in query as aspects.
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'for', 'in', 'on', 'at', 'to', 'by', 'show', 'calculate', 'get', 'list', 'what', 'how', 'when', 'where', 'who', 'why'}
        query_terms = set(re.findall(r'\w+', query.lower())) - stop_words
        
        if not query_terms:
            return 1.0 # Empty query, trivially covered? Or 0.0? Assuming 1.0 for robustness against empty queries
            
        combined_chunk_text = " ".join(chunks).lower()
        chunk_terms = set(re.findall(r'\w+', combined_chunk_text))
        
        aspects_covered = len(query_terms & chunk_terms)
        return aspects_covered / len(query_terms)
    
    def calculate_coherence(self, chunks: List[str]) -> float:
        """
        Check if chunks are consistent (not contradictory).
        Simple heuristic: Check for obvious negations or conflicting numbers for same entity?
        For now, assume high coherence if chunks share some vocabulary (context overlap).
        """
        if len(chunks) <= 1:
            return 1.0
            
        # Check pairwise Jaccard similarity as a proxy for coherence/relatedness
        scores = []
        for i in range(len(chunks)):
            for j in range(i + 1, len(chunks)):
                set1 = set(re.findall(r'\w+', chunks[i].lower()))
                set2 = set(re.findall(r'\w+', chunks[j].lower()))
                if not set1 or not set2:
                    scores.append(0.0)
                    continue
                intersection = len(set1 & set2)
                union = len(set1 | set2)
                scores.append(intersection / union)
        
        avg_sim = sum(scores) / len(scores) if scores else 0.0
        # Normalize: 0.0 sim is not necessarily bad (could be different parts), but we want some overlap in a coherent narrative.
        # Let's map it: some overlap is good.
        return min(1.0, avg_sim * 2 + 0.5) # lenient scoring
    
    def calculate_sufficiency(self, query: str, chunks: List[str]) -> float:
        """
        Estimate if we have enough information.
        Heuristic: High relevance + high coverage = sufficient.
        """
        # We can reuse the other metrics
        rel = self.calculate_relevance(query, chunks)
        cov = self.calculate_coverage(query, chunks)
        
        # Length heuristic: extremely short chunks might be insufficient
        avg_len = sum(len(c.split()) for c in chunks) / len(chunks) if chunks else 0
        len_score = min(1.0, avg_len / 50.0) # Assume 50 words is "decent" chunk size
        
        return (rel * 0.4 + cov * 0.4 + len_score * 0.2)
