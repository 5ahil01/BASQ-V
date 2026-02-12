from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    query: str
    sql_query: str
    result: List[Dict[str, Any]]
    sql_confidence: Optional[float] = None
    retrieval_confidence: Optional[float] = None
    status: Optional[str] = None
    correction_attempts: Optional[int] = 0
    total_time_ms: Optional[float] = None
    self_reflection_log: Optional[List[Dict[str, Any]]] = None
    recommendation: Optional[str] = None
