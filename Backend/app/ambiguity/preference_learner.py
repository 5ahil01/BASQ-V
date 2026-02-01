import json
import os

class PreferenceLearner:
    def __init__(self, storage_file="preferences.json"):
        # Store in the same directory as this file for simplicity, 
        # or use a proper app data path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.storage_file = os.path.join(current_dir, storage_file)
        self.preferences = self._load_preferences()

    def _load_preferences(self):
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return {}
        return {}

    def _save_preferences(self):
        with open(self.storage_file, 'w') as f:
            json.dump(self.preferences, f, indent=4)

    def learn(self, term, chosen_option, query=None):
        """
        Learns from the user's choice.
        """
        if term not in self.preferences:
            self.preferences[term] = {
                "count": 0,
                "options": {}
            }
        
        self.preferences[term]["count"] += 1
        
        if chosen_option not in self.preferences[term]["options"]:
             self.preferences[term]["options"][chosen_option] = 0
             
        self.preferences[term]["options"][chosen_option] += 1
        self._save_preferences()

    def get_preference(self, term):
        """
        Returns the preferred option if available, regardless of confidence.
        """
        if term not in self.preferences:
            return None
        
        options = self.preferences[term]["options"]
        if not options:
            return None
            
        # Return option with max count
        return max(options, key=options.get)

    def get_confidence(self, term):
        """
        Calculates confidence score (0-1).
        """
        if term not in self.preferences:
            return 0.0
            
        data = self.preferences[term]
        total_term_usage = data["count"]
        
        if total_term_usage == 0:
            return 0.0
            
        preferred_option = self.get_preference(term)
        if not preferred_option:
            return 0.0
            
        option_count = data["options"].get(preferred_option, 0)
        
        return option_count / total_term_usage

    def should_ask_clarification(self, term, confidence_threshold=0.7):
        """
        Decides whether to ask for clarification based on confidence.
        """
        confidence = self.get_confidence(term)
        return confidence < confidence_threshold
