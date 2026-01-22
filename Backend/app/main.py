from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models, schemas
from .services.rag_service import RagService
from .services.sql_service import SqlService

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
rag_service = RagService()
sql_service = SqlService()

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
        # 1. Convert Question to SQL
        generated_sql = rag_service.generate_sql(request.query)
        
        # 2. Execute SQL
        results = sql_service.execute_query(generated_sql)
        
        return schemas.QueryResponse(
            query=request.query,
            sql_query=generated_sql,
            result=results
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
