print("Starting test_ambiguity.py execution...")
import os
import sys
import traceback

try:
    print("Importing modules...")
    from app.ambiguity.ambiguity_resolver import AmbiguityResolver
    from app.ambiguity.preference_learner import PreferenceLearner
    print("Modules imported successfully.")

    # Helper to clear preferences before tests
    def clear_preferences():
        print("Clearing preferences...")
        # Construct path relative to this file
        preferences_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preferences.json")
        if os.path.exists(preferences_file):
            print(f"Removing {preferences_file}")
            os.remove(preferences_file)
        else:
            print("No preferences file to remove.")

    def test_no_ambiguity():
        print("Running test_no_ambiguity...")
        resolver = AmbiguityResolver()
        result = resolver.process_query("Show me all products")
        assert result["status"] == "auto_resolved"
        assert result["resolved_query"] == "Show me all products"
        print("test_no_ambiguity passed.")

    def test_detection_and_clarification():
        print("Running test_detection_and_clarification...")
        clear_preferences()
        resolver = AmbiguityResolver()
        result = resolver.process_query("Show last year revenue")
        
        assert result["status"] == "needs_clarification"
        # The term in detecting is lowercase "last year" from taxonomy
        assert "last year" in result["term"]
        assert "options" in result
        print("test_detection_and_clarification passed.")

    def test_learning_and_resolution():
        print("Running test_learning_and_resolution...")
        clear_preferences()
        resolver = AmbiguityResolver()
        
        # 1. First query needs clarification
        print("  Substep 1: Query needs clarification")
        result = resolver.process_query("Show last year")
        assert result["status"] == "needs_clarification"
        
        # 2. Handle response
        print("  Substep 2: Handling response")
        resolver.handle_user_response("Show last year", "last year", "Fiscal Year")
        
        # 3. Repeat query - should be resolved now 
        print("  Substep 3: Re-querying")
        # Since we have 1 data point, 1/1 = 100% confidence >= 0.7 threshold
        result = resolver.process_query("Show last year")
        assert result["status"] == "auto_resolved"
        assert "Fiscal Year" in result["resolved_query"]
        print("test_learning_and_resolution passed.")

    if __name__ == "__main__":
        print("Entering main block...")
        try:
            test_no_ambiguity()
            test_detection_and_clarification()
            test_learning_and_resolution()
            print("All manual tests passed!")
        except AssertionError as e:
            print(f"Test failed: {e}")
            traceback.print_exc()
        except Exception as e:
            print(f"An error occurred during tests: {e}")
            traceback.print_exc()

except Exception as e:
    print(f"Critical error during startup: {e}")
    traceback.print_exc()
