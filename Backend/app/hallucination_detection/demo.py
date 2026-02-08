import json
from confidence_scorer import SQLConfidenceScorer
from self_corrector import SQLSelfCorrector

def print_result(title, result):
    print(f"\n{'='*50}")
    print(f"CASE: {title}")
    print(f"{'='*50}")
    print(json.dumps(result, indent=2))

def demo():
    # 1. Setup Schema
    schema = {
        'sales': ['region', 'net_revenue', 'fiscal_year', 'sales_rep_id'],
        'customers': ['customer_id', 'name', 'segment'],
        'products': ['product_id', 'category', 'price']
    }
    
    # 2. Setup Context
    context = [
        "Revenue is calculated using net_revenue column",
        "Use fiscal_year for filtering by year",
        "Sales excludes returns"
    ]
    
    scorer = SQLConfidenceScorer(schema)
    corrector = SQLSelfCorrector()
    
    # Example 1: High Confidence SQL
    print("\n\n>>> Running Example 1: High Confidence SQL")
    sql_high = "SELECT region, SUM(net_revenue) FROM sales WHERE fiscal_year = 2023 GROUP BY region"
    result_high = scorer.evaluate(sql_high, context)
    print_result("High Confidence Check", result_high)
    
    # Example 2: Low Confidence (Hallucinations)
    print("\n\n>>> Running Example 2: Low Confidence SQL (Hallucinations)")
    sql_low = "SELECT customer_name, total_revenue FROM orders WHERE year = 2023"
    result_low = scorer.evaluate(sql_low, context)
    print_result("Low Confidence Check", result_low)
    
    # Example 3: Medium Confidence (Needs Correction)
    print("\n\n>>> Running Example 3: Medium Confidence (Needs Correction)")
    sql_medium = "SELECT region, SUM(net_revenue) FROM sales WHERE SUM(net_revenue) > 1000 GROUP BY region"
    result_medium = scorer.evaluate(sql_medium, context)
    print_result("Medium Confidence Check", result_medium)
    
    if result_medium['recommendation'] == 'CORRECT':
        print("\nAttempting Self-Correction...")
        corrected_sql = corrector.correct(sql_medium, result_medium['issues'])
        if corrected_sql:
            print(f"Original SQL: {sql_medium}")
            print(f"Corrected SQL: {corrected_sql}")
            
            # Re-validate
            print("Re-validating corrected SQL...")
            result_corrected = scorer.evaluate(corrected_sql, context)
            print_result("Corrected SQL Check", result_corrected)
        else:
            print("Could not correct SQL.")

if __name__ == "__main__":
    try:
        demo()
    except ImportError:
        print("Please ensure you are running this script from within the package or with correct PYTHONPATH.")
        print("You might need to install sqlparse: pip install sqlparse")
