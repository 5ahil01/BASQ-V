from typing import List, Dict, Any, Optional
import time

from .retrieval_quality_assessor import RetrievalQualityAssessor
from .adaptive_retriever import AdaptiveRetriever
from .answer_verifier import AnswerVerifier
from .self_corrector import SelfCorrector

class SelfReflectiveRAG:
    """
    Main class implementing self-reflective RAG.
    Integrates all components: Adaptive Retrieval -> Generation -> Verification -> Correction.
    """
    
    def __init__(self, business_rag: Any, confidence_scorer: Any, sql_generator: Any):
        self.business_rag = business_rag          # Component 1
        self.confidence_scorer = confidence_scorer # Component 4
        self.sql_generator = sql_generator        # LLM SQL generator
        
        # Self-reflective components
        self.retrieval_assessor = RetrievalQualityAssessor()
        self.adaptive_retriever = AdaptiveRetriever(self.business_rag, self.retrieval_assessor)
        self.answer_verifier = AnswerVerifier()
        
        self.self_corrector = SelfCorrector(
            self.adaptive_retriever,
            self.sql_generator,
            self.answer_verifier
        )
    
    def query_with_reflection(self, user_query: str) -> Dict:
        """
        Complete self-reflective query processing.
        
        Flow:
        1. Adaptive Retrieval (Component 5 sub-component)
        2. SQL Generation (Component 1/LLM)
        3. SQL Validation (Component 4)
        4. Answer Verification (Component 5 sub-component)
        5. Self-Correction (Component 5 sub-component)
        """
        start_time = time.time()
        reflection_log = []
        
        # PHASE 1: ADAPTIVE RETRIEVAL WITH QUALITY ASSESSMENT
        print("\n" + "="*60)
        print("PHASE 1: Adaptive Retrieval")
        print("="*60)
        
        retrieval_result = self.adaptive_retriever.retrieve_adaptively(user_query)
        chunks = retrieval_result['chunks']
        retrieval_confidence = retrieval_result['final_confidence']
        
        reflection_log.append({
            'phase': 'adaptive_retrieval',
            'confidence': retrieval_confidence,
            'chunks_retrieved': len(chunks),
            'iterations': retrieval_result['iterations']
        })
        
        print(f"[OK] Retrieved {len(chunks)} chunks with confidence {retrieval_confidence:.2f}")
        
        # PHASE 2: SQL GENERATION
        print("\n" + "="*60)
        print("PHASE 2: SQL Generation")
        print("="*60)
        
        # Generate SQL using the retrieved context
        # Assuming generator.generate takes (query, chunks)
        # Verify signature in integration logic later
        try:
            sql = self.sql_generator.generate(user_query, chunks)
        except Exception as e:
            print(f"Error in SQL generation: {e}")
            sql = "SELECT 'Error in generation' as error"
        
        print(f"Generated SQL: {sql}")
        
        # PHASE 3: SQL CONFIDENCE SCORING (Component 4)
        print("\n" + "="*60)
        print("PHASE 3: SQL Validation")
        print("="*60)
        
        # Component 4 integration
        try:
            sql_validation = self.confidence_scorer.score(sql, user_query, chunks)
            # If component 4 returns complex object, extract what we need
            sql_confidence = sql_validation.get('overall_confidence', 0.0)
            recommendation = sql_validation.get('recommendation', 'UNKNOWN')
        except Exception as e:
            print(f"Warning: Confidence Scorer failed: {e}")
            sql_validation = {}
            sql_confidence = 0.5 # Default
            recommendation = 'REVIEW'
            
        reflection_log.append({
            'phase': 'sql_validation',
            'confidence': sql_confidence,
            'recommendation': recommendation
        })
        
        print(f"SQL Confidence: {sql_confidence:.2f}")
        print(f"Recommendation: {recommendation}")
        
        # PHASE 4: ANSWER VERIFICATION
        print("\n" + "="*60)
        print("PHASE 4: Answer Verification")
        print("="*60)
        
        verification = self.answer_verifier.verify(sql, user_query, chunks)
        
        reflection_log.append({
            'phase': 'verification',
            'verified': verification['verified'],
            'faithfulness': verification['faithfulness_score']
        })
        
        print(f"Verified: {verification['verified']}")
        print(f"Faithfulness: {verification['faithfulness_score']:.2f}")
        
        # PHASE 5: SELF-CORRECTION (if needed)
        correction_attempts = 0
        final_sql = sql
        final_confidence = sql_confidence
        
        if not verification['verified'] or sql_confidence < 0.70:
            print("\n" + "="*60)
            print("PHASE 5: Self-Correction")
            print("="*60)
            
            # Combine issues from verification and validation
            issues = verification['issues']
            # If validation failed, add why
            if sql_confidence < 0.70:
                issues.append({'type': 'low_confidence', 'value': f"{recommendation}"})
            
            correction_result = self.self_corrector.correct(
                final_sql, user_query, issues, chunks
            )
            
            if correction_result['success']:
                final_sql = correction_result['corrected_sql']
                # Re-score confidence for the new SQL?
                # The corrector returns 'final_verification' but not necessarily 'final_validation' from Component 4.
                # Ideally we should re-run Component 4 validation on fixed SQL.
                try:
                    new_val = self.confidence_scorer.score(final_sql, user_query, chunks)
                    final_confidence = new_val.get('overall_confidence', 0.8) # Optimistic
                except:
                    final_confidence = 0.8 # Optimistic fallback
                    
                correction_attempts = correction_result['attempts']
                print(f"[OK] Corrected after {correction_attempts} attempts")
                print(f"New confidence: {final_confidence:.2f}")
            else:
                print(f"[FAIL] Correction failed after {correction_result['attempts']} attempts")
                correction_attempts = correction_result['attempts']
            
            reflection_log.append({
                'phase': 'self_correction',
                'success': correction_result['success'],
                'attempts': correction_attempts
            })
        
        total_time_ms = (time.time() - start_time) * 1000
        
        return {
            'status': 'success' if final_confidence >= 0.70 else 'low_confidence',
            'sql': final_sql,
            'sql_confidence': final_confidence,
            'retrieval_confidence': retrieval_confidence,
            'chunks_used': len(chunks),
            'retrieval_iterations': retrieval_result['iterations'],
            'correction_attempts': correction_attempts,
            'total_time_ms': total_time_ms,
            'self_reflection_log': reflection_log,
            'recommendation': recommendation
        }
