from typing import Dict, List, Any
import logging

try:
    from .schema_validator import SchemaValidator
    from .syntax_checker import SyntaxChecker
    from .semantic_validator import SemanticValidator
    from .context_checker import ContextChecker
    from .hallucination_detector import HallucinationDetector
except ImportError:
    # For running as a script (e.g. tests)
    from schema_validator import SchemaValidator
    from syntax_checker import SyntaxChecker
    from semantic_validator import SemanticValidator
    from context_checker import ContextChecker
    from hallucination_detector import HallucinationDetector

class SQLConfidenceScorer:
    """
    Orchestrates validation components to produce a confidence score for generated SQL.
    Combines Schema, Syntax, Semantic, Context, and Business Logic scores.
    """
    
    def __init__(self, schema: Dict[str, List[str]]):
        self.schema_validator = SchemaValidator(schema)
        self.syntax_checker = SyntaxChecker()
        self.semantic_validator = SemanticValidator()
        self.context_checker = ContextChecker()
        self.hallucination_detector = HallucinationDetector(self.schema_validator)
        
    def evaluate(self, sql: str, context: List[str] = None) -> Dict[str, Any]:
        """
        Evaluate SQL query and return confidence scores and issues.
        
        Args:
            sql: The SQL query to evaluate.
            context: List of business context strings.
            
        Returns:
            Dictionary containing:
            - overall_confidence: float (0-1)
            - dimension_scores: Dict[str, float]
            - recommendation: str (EXECUTE, REVIEW, CORRECT, REJECT)
            - issues: List[Dict]
            - hallucinations_detected: bool
        """
        if context is None:
            context = []
            
        # 1. Syntax Check
        is_syntax_valid, syntax_issue = self.syntax_checker.check(sql)
        syntax_score = 1.0 if is_syntax_valid else 0.0
        
        # 2. Schema Check
        is_schema_valid, schema_issues = self.schema_validator.validate(sql)
        schema_score = 1.0 if is_schema_valid else 0.0
        # Analyze schema issues for partial credit? 
        # For now, 0 or 1. Maybe if 1 of 5 tables is wrong, score 0.8? 
        # But critical tables missing is usually bad. Keep simple 1.0/0.0 or refined later.
        
        # 3. Semantic Check
        is_semantic_valid, semantic_issues_list = self.semantic_validator.validate(sql)
        semantic_score = 1.0 if is_semantic_valid else (0.5 if len(semantic_issues_list) == 1 else 0.0)
        
        # 4. Context Check
        context_score = self.context_checker.validate(sql, context)
        
        # 5. Business Logic Check (Placeholder/Combined)
        # We'll assume perfect business logic if context is met, 
        # or penalize if specific keywords are violated?
        # For this implementation, we'll align it with context score 
        # or set to 1.0 if no specific violations found.
        business_logic_score = 1.0 
        
        # Calculate Weighted Average
        # Weights: Schema 0.35, Syntax 0.25, Semantic 0.20, Context 0.15, Business 0.05
        # Adjusted from prompt:
        # schema_score * 0.30 + syntax_score * 0.25 + semantic_score * 0.20 + context_score * 0.15 + business_logic_score * 0.10
        
        overall_confidence = (
            schema_score * 0.30 +
            syntax_score * 0.25 +
            semantic_score * 0.20 +
            context_score * 0.15 +
            business_logic_score * 0.10
        )
        
        # Round to 2 decimals
        overall_confidence = round(overall_confidence, 2)
        
        # Determine Recommendation
        if overall_confidence >= 0.85:
            recommendation = 'EXECUTE'
        elif overall_confidence >= 0.70:
            recommendation = 'REVIEW'
        elif overall_confidence >= 0.50:
            recommendation = 'CORRECT'
        else:
            recommendation = 'REJECT'
            
        # Collect Issues
        issues = []
        if syntax_issue:
            issues.append({'type': 'syntax_error', 'severity': 'critical', 'details': syntax_issue})
            
        hallucinations = self.hallucination_detector.detect_all(sql, schema_issues)
        issues.extend(hallucinations)
        
        for issue in semantic_issues_list:
            issues.append({'type': 'semantic_error', 'severity': 'high', 'details': issue})
            
        # Add context issues if score is low
        if context_score < 0.5 and context:
             issues.append({'type': 'context_ignored', 'severity': 'medium', 'details': "Low alignment with business context."})

        return {
            'overall_confidence': overall_confidence,
            'dimension_scores': {
                'schema': schema_score,
                'syntax': syntax_score,
                'semantic': semantic_score,
                'context': context_score,
                'business_logic': business_logic_score
            },
            'recommendation': recommendation,
            'issues': issues,
            'hallucinations_detected': len(hallucinations) > 0
        }
