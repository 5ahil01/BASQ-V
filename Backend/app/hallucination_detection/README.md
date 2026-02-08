# Component 4: Hallucination Detection & SQL Confidence Scoring

This component provides robust validation for generated SQL queries, ensuring they are syntactically correct, semantically valid, and aligned with your database schema and business context.

## Features

- **Multi-dimensional Scoring**: Evaluates SQL based on Schema, Syntax, Semantics, Context, and Business Logic.
- **Hallucination Detection**: Identifies non-existent tables, columns, and made-up functions.
- **Self-Correction**: Attempt to fix common errors automatically (e.g., aggregate functions in WHERE clause).
- **Rule-Based**: No external ML models required, ensuring fast execution.

## Installation

This component requires `sqlparse`. You can install it via pip:

```bash
pip install sqlparse
```

## Usage

### basic Usage

```python
from confidence_scorer import SQLConfidenceScorer
from self_corrector import SQLSelfCorrector

# 1. Define your database schema
schema = {
    'sales': ['region', 'net_revenue', 'fiscal_year'],
    'customers': ['id', 'name']
}

# 2. Define business context (optional)
context = [
    "Revenue = net_revenue column",
    "Use fiscal_year for filtering"
]

# 3. Initialize Scorer
scorer = SQLConfidenceScorer(schema)

# 4. Evaluate SQL
sql = "SELECT region, SUM(net_revenue) FROM sales GROUP BY region"
result = scorer.evaluate(sql, context)

print(f"Overall Confidence: {result['overall_confidence']}")
print(f"Recommendation: {result['recommendation']}")

if result['issues']:
    print("Issues found:", result['issues'])
```

### Self-Correction

If confidence is between 0.5 and 0.7 (CORRECT recommendation), use the self-corrector:

```python
corrector = SQLSelfCorrector()

if result['recommendation'] == 'CORRECT':
    corrected_sql = corrector.correct(sql, result['issues'])
    if corrected_sql:
        print(f"Corrected SQL: {corrected_sql}")
        # Re-validate
        new_result = scorer.evaluate(corrected_sql, context)
```

## How It Works

### Dimensions

| Dimension    | Description                                 | Weight |
| ------------ | ------------------------------------------- | ------ |
| **Schema**   | Do tables and columns exist in the DB?      | 30%    |
| **Syntax**   | Is the SQL parseable?                       | 25%    |
| **Semantic** | Are logical rules followed (e.g. GROUP BY)? | 20%    |
| **Context**  | Does it use retrieved business terms?       | 15%    |
| **Business** | General rule compliance                     | 10%    |

### Hallucination Detection

The `HallucinationDetector` checks for:

- Tables not in the schema
- Columns not in the schema tables
- Functions that don't exist in standard SQL
- Suspicious patterns

## File Structure

- `schema_validator.py`: Validates tables/columns against schema.
- `syntax_checker.py`: Uses `sqlparse` to check syntax.
- `semantic_validator.py`: Checks for logical errors (GROUP BY, Aggregates).
- `context_checker.py`: Checks alignment with business context terms.
- `hallucination_detector.py`: Detects specific hallucination types.
- `confidence_scorer.py`: Main class orchestrating validation.
- `self_corrector.py`: Attempts to fix issues.
- `test_component4.py`: Unit tests.
- `demo.py`: Example script.

## Running Tests

Run the tests using `pytest`:

```bash
pytest test_component4.py
```
