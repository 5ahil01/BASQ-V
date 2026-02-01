from .ambiguity_taxonomy import AMBIGUITY_TAXONOMY

class AmbiguityDetector:
    def __init__(self):
        self.taxonomy = AMBIGUITY_TAXONOMY

    def detect(self, query):
        """
        Scans the query for ambiguous terms defined in the taxonomy.
        Returns a list of dictionaries containing the detected term, its category, and details.
        """
        detected = []
        lowered_query = query.lower()
        
        for category, terms in self.taxonomy.items():
            for term, details in terms.items():
                if term in lowered_query:
                    detected.append({
                        "term": term,
                        "category": category,
                        "details": details
                    })
        return detected
