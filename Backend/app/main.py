from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models, schemas
from .services.rag_service import RagService
from .services.sql_service import SqlService
from .self_reflective_rag.self_reflective_rag import SelfReflectiveRAG
from .self_reflective_rag.integration_helpers import load_component1, load_component4, create_sql_generator

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite dev server and common React ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
# 1. Basic Services
rag_service = RagService()
sql_service = SqlService()

# 2. Self-Reflective Components
# using helpers to wrap existing services where possible
business_rag = load_component1() 
confidence_scorer = load_component4() 
sql_generator = create_sql_generator()

# 3. Main System
self_reflective_rag = SelfReflectiveRAG(business_rag, confidence_scorer, sql_generator)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    return {"Hello": "World", "DB": "Connected"}

@app.post("/query", response_model=schemas.QueryResponse)
def query_database(request: schemas.QueryRequest):
    try:
        # 1. Use Self-Reflective RAG
        reflection_result = self_reflective_rag.query_with_reflection(request.query)
        
        generated_sql = reflection_result['sql']
        
        # 2. Execute SQL (only if we have a valid SQL)
        if generated_sql and not generated_sql.startswith("Error"):
             # Sometimes the result might be an error message if generation failed completely
             results = sql_service.execute_query(generated_sql)
        else:
             results = []
        
        return schemas.QueryResponse(
            query=request.query,
            sql_query=generated_sql,
            result=results,
            sql_confidence=reflection_result.get('sql_confidence'),
            retrieval_confidence=reflection_result.get('retrieval_confidence'),
            status=reflection_result.get('status'),
            correction_attempts=reflection_result.get('correction_attempts'),
            total_time_ms=reflection_result.get('total_time_ms'),
            self_reflection_log=reflection_result.get('self_reflection_log'),
            recommendation=reflection_result.get('recommendation')
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
