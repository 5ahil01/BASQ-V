class ClarificationGenerator:
    def generate(self, start_term_details):
        """
        Generates the clarification question and options.
        expected input: details dictionary from AmbiguityTaxonomy
        """
        return {
            "question": start_term_details.get("question", "Verification needed."),
            "options": start_term_details.get("options", [])
        }
