from typing import List, Dict, Any, Optional
import time

class AdaptiveRetriever:
    """
    Implements adaptive retrieval strategy.
    This is NOVEL - standard RAG uses fixed k.
    """
    
    def __init__(self, business_rag: Any, quality_assessor: Any):
        """
        Args:
            business_rag: Component 1 instance (must have retrieve_context method)
            quality_assessor: Component 5 RetrievalQualityAssessor instance
        """
        self.business_rag = business_rag
        self.assessor = quality_assessor
        self.max_iterations = 5
        self.confidence_threshold = 0.70
    
    def retrieve_adaptively(self, user_query: str) -> Dict:
        """
        Adaptive retrieval with quality assessment.
        
        Algorithm:
        1. Start with k=3 chunks
        2. Assess quality
        3. If confidence < 0.70 and iterations < 5:
           - If confidence < 0.40: k += 5 (very low, need much more)
           - If confidence 0.40-0.70: k += 2 (medium, need some more)
        4. Retrieve additional chunks
        5. Reassess combined chunks
        6. Repeat until confident or max iterations
        
        Returns:
            {
                'chunks': List[str],
                'final_confidence': float,
                'iterations': int,
                'total_chunks_retrieved': int,
                'retrieval_log': List[Dict],
                'status': str
            }
        """
        k = 3  # Start small
        iteration = 0
        all_chunks: List[str] = []
        retrieval_log: List[Dict] = []
        
        # We need a way to track unique chunks. Assuming strings are unique enough or use IDs if available.
        # For this implementation, we'll use set of strings.
        unique_chunks_content = set()
        
        current_k = k
        
        while iteration < self.max_iterations:
            # Retrieve chunks using Component 1
            # Note: Component 1's retrieve_context might return objects or strings.
            # We assume it returns list of strings for now based on prompt.
            # If it returns objects, we'd need to extract text.
            try:
                new_chunks = self.business_rag.retrieve_context(user_query, k=current_k)
            except AttributeError:
                # Fallback or mock for testing if Component 1 isn't fully integrated yet
                print("Warning: business_rag.retrieve_context not found, using mock.")
                new_chunks = [f"Mock chunk {i} for {user_query}" for i in range(current_k)]

            # Add to collection
            iteration_added = 0
            for chunk in new_chunks:
                if chunk not in unique_chunks_content:
                    unique_chunks_content.add(chunk)
                    all_chunks.append(chunk)
                    iteration_added += 1
            
            # Assess quality
            assessment = self.assessor.assess(user_query, all_chunks)
            confidence = assessment['overall_confidence']
            
            # Log this iteration
            retrieval_log.append({
                'iteration': iteration + 1,
                'k_requested': current_k,
                'new_unique_chunks': iteration_added,
                'total_chunks': len(all_chunks),
                'confidence': confidence,
                'assessment': assessment
            })
            
            print(f"Iteration {iteration + 1}: requested k={current_k}, confidence={confidence:.2f}")
            
            # Check if sufficient
            if confidence >= self.confidence_threshold:
                print(f"[OK] Sufficient confidence reached: {confidence:.2f}")
                break
            
            # Decide how many more to retrieve
            # The logic in prompt says "retrieve more". IDK if Component 1 supports offset.
            # Usually RAG retrievers just take 'k'.
            # So if we want *more*, we should ask for a larger K next time, or ask for next batch?
            # Standard vector DBs: retrieve(k=10) gets top 10.
            # If we already have top 3, and want 2 more, we should ask for top 5?
            # The prompt says: "k += 5" implying we increase the limit.
            
            if confidence < 0.40:
                current_k += 5  # Low confidence, retrieve much more
            elif confidence < 0.70:
                current_k += 2  # Medium confidence, retrieve some more
            
            iteration += 1
        
        return {
            'chunks': all_chunks,
            'final_confidence': confidence,
            'iterations': iteration + 1 if confidence >= self.confidence_threshold else iteration, # Correct count
            'total_chunks_retrieved': len(all_chunks),
            'retrieval_log': retrieval_log,
            'status': 'sufficient' if confidence >= self.confidence_threshold else 'max_iterations_reached'
        }
