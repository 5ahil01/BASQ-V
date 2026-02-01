from typing import Dict, Optional
import re
from .ambiguity_detector import AmbiguityDetector
from .preference_learner import PreferenceLearner
from .clarification_generator import ClarificationGenerator

class AmbiguityResolver:
    def __init__(self):
        self.detector = AmbiguityDetector()
        self.learner = PreferenceLearner()
        self.generator = ClarificationGenerator()

    def process_query(self, user_query: str) -> Dict:
        """
        Process the query to detect and resolve ambiguities.
        """
        ambiguities = self.detector.detect(user_query)
        
        if not ambiguities:
             return {
                 "status": "auto_resolved",
                 "resolved_query": user_query,
                 "original_query": user_query
             }

        resolved_parts = {} 
        needs_clarification = []

        for item in ambiguities:
            term = item["term"]
            
            if self.learner.should_ask_clarification(term):

                needs_clarification.append(item)
            else:
                preference = self.learner.get_preference(term)
                # If for some reason we have confidence but no preference (shouldn't happen), ask
                if preference:
                    resolved_parts[term] = preference
                else:
                    needs_clarification.append(item)

        if needs_clarification:
             # Just return the first one needing clarification for to avoid overwhelming user
             first_issue = needs_clarification[0]
             clarification = self.generator.generate(first_issue["details"])
             return {
                 "status": "needs_clarification",
                 "message": clarification["question"],
                 "options": clarification["options"],
                 "term": first_issue["term"],
                 "original_query": user_query
             }
        
        # If we reach here, all ambiguities are resolved
        resolved_query = user_query
        
        # Case-insensitive replacement
        for term, resolution in resolved_parts.items():
            pattern = re.compile(re.escape(term), re.IGNORECASE)
            # Replaces "term" with "term (resolution)" e.g. "last year" -> "last year (Fiscal Year)"
            resolved_query = pattern.sub(f"{term} ({resolution})", resolved_query)
             
        return {
            "status": "auto_resolved",
            "resolved_query": resolved_query,
            "original_query": user_query
        }

    def handle_user_response(self, query: str, term: str, choice: str) -> Dict:
        """
        Handles the user's response to a clarification question.
        """
        self.learner.learn(term, choice, query)
        
        return {
             "status": "preference_learned",
             "term": term,
             "choice": choice
        }
