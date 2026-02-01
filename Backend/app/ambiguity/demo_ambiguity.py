import sys
import os

# Add parent directory to path to allow importing app.ambiguity
# Assuming this script is run from d:/BASQ-V/Backend/app/ambiguity or d:/BASQ-V/Backend/
# We want to add d:/BASQ-V/Backend/ to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.ambiguity.ambiguity_resolver import AmbiguityResolver

def main():
    resolver = AmbiguityResolver()
    print("--- Ambiguity Resolution Demo ---")
    print("Type 'exit' to quit.")
    
    while True:
        try:
            query = input("\nEnter query: ")
        except EOFError:
            break
            
        if query.lower() == 'exit':
            break
            
        result = resolver.process_query(query)
        
        if result['status'] == 'auto_resolved':
            print(f"Resolved: {result['resolved_query']}")
            
        elif result['status'] == 'needs_clarification':
            print(f"Ambiguity detected for '{result['term']}'")
            print(f"Question: {result['message']}")
            
            print("Options:")
            for i, option in enumerate(result['options']):
                print(f"{i + 1}. {option}")
                
            choice_idx = input("Select option (number): ")
            try:
                choice_idx = int(choice_idx) - 1
                if 0 <= choice_idx < len(result['options']):
                    choice = result['options'][choice_idx]
                    resolver.handle_user_response(query, result['term'], choice)
                    print(f"Learned preference: {result['term']} -> {choice}")
                    
                    # Re-try automatically for better UX in demo
                    print("Retrying query...")
                    retry_result = resolver.process_query(query)
                    if retry_result['status'] == 'auto_resolved':
                         print(f"Resolved: {retry_result['resolved_query']}")
                else:
                    print("Invalid selection.")
            except ValueError:
                print("Invalid input.")

if __name__ == "__main__":
    main()
