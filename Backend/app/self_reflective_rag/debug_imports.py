
import sys
import os

# Ensure project root is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '../../'))
sys.path.append(project_root)

print(f"Project root added to path: {project_root}")

try:
    from app.services.rag_service import RagService
    print("SUCCESS: Imported RagService")
except ImportError as e:
    print(f"FAILURE: Could not import RagService. Error: {e}")

try:
    from app.hallucination_detection.confidence_scorer import SQLConfidenceScorer
    print("SUCCESS: Imported SQLConfidenceScorer")
except ImportError as e:
    print(f"FAILURE: Could not import SQLConfidenceScorer. Error: {e}")

try:
    from app.prompts import SQL_GENERATION_TEMPLATE
    print("SUCCESS: Imported SQL_GENERATION_TEMPLATE")
except ImportError as e:
    print(f"FAILURE: Could not import SQL_GENERATION_TEMPLATE. Error: {e}")
