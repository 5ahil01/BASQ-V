from sqlalchemy import text
from app.database import SessionLocal
import logging

class SqlService:
    def __init__(self):
        pass

    def execute_query(self, sql_query: str):
        # Basic Safety Check
        if not sql_query.strip().lower().startswith("select"):
             raise ValueError("Only SELECT queries are allowed for safety.")

        db = SessionLocal()
        try:
            result_proxy = db.execute(text(sql_query))
            keys = result_proxy.keys()
            results = [dict(zip(keys, row)) for row in result_proxy.fetchall()]
            return results
        except Exception as e:
            logging.error(f"Database execution error: {e}")
            raise e
        finally:
            db.close()
