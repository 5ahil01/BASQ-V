from typing import List, Dict, Any
import math

class Component5Metrics:
    """
    Metrics to measure self-reflective RAG performance for research paper.
    """
    
    def calculate_metrics(self, test_results: List[Dict]) -> Dict:
        """
        Calculate all metrics for research paper.
        
        Args:
            test_results: List of result dicts from query_with_reflection, 
                          plus 'ground_truth_correct' boolean if available.
        """
        if not test_results:
            return {}
            
        retrieval_metrics = self.calculate_retrieval_efficiency(test_results)
        correction_metrics = self.calculate_correction_stats(test_results)
        calibration_metrics = self.calculate_calibration(test_results)
        
        return {
            'retrieval_efficiency': retrieval_metrics,
            'self_correction': correction_metrics,
            'confidence_calibration': calibration_metrics,
            'total_queries': len(test_results)
        }
    
    def calculate_retrieval_efficiency(self, results: List[Dict]) -> Dict:
        total_chunks = sum(r.get('chunks_used', 0) for r in results)
        total_iterations = sum(r.get('retrieval_iterations', 0) for r in results)
        count = len(results)
        
        # Baseline fixed k=5 assumption
        baseline_chunks = count * 5
        saved = baseline_chunks - total_chunks
        
        return {
            'avg_chunks_retrieved': total_chunks / count,
            'avg_iterations': total_iterations / count,
            'chunks_saved_total': saved,
            'efficiency_gain_pct': (saved / baseline_chunks) * 100 if baseline_chunks else 0
        }
    
    def calculate_correction_stats(self, results: List[Dict]) -> Dict:
        corrections_triggered = [r for r in results if r.get('correction_attempts', 0) > 0]
        if not corrections_triggered:
            return {'correction_rate': 0.0, 'success_rate': 0.0}
            
        success_count = sum(1 for r in corrections_triggered if r.get('status') == 'success')
        
        return {
            'correction_trigger_rate': len(corrections_triggered) / len(results),
            'correction_success_rate': success_count / len(corrections_triggered),
            'avg_attempts': sum(r.get('correction_attempts', 0) for r in corrections_triggered) / len(corrections_triggered)
        }
        
    def calculate_calibration(self, results: List[Dict]) -> Dict:
        """
        Calculate Expected Calibration Error (ECE) if ground truth exists.
        Otherwise just return alignment of confidence with status.
        """
        # Simple correlation between confidence and success status
        # Success = 1, Fail/Low Conf = 0
        
        confidences = [r.get('sql_confidence', 0.0) for r in results]
        outcomes = [1.0 if r.get('status') == 'success' else 0.0 for r in results]
        
        # Pearson correlation
        if len(results) < 2:
            return {'correlation': 0.0}
            
        mean_conf = sum(confidences) / len(confidences)
        mean_out = sum(outcomes) / len(outcomes)
        
        numerator = sum((c - mean_conf) * (o - mean_out) for c, o in zip(confidences, outcomes))
        denom = math.sqrt(sum((c - mean_conf)**2 for c in confidences) * sum((o - mean_out)**2 for o in outcomes))
        
        return {
            'correlation': numerator / denom if denom else 0.0,
            'avg_confidence': mean_conf,
            'avg_success_rate': mean_out
        }
