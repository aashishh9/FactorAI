from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.ai import router as ai_router
from app.db.database import engine
from app.api.production import router as production_router
from app.api.factory import router as factory_router
from app.api.dashboard import router as dashboard_router
from app.api.anomalies import router as anomalies_router
from app.api.maintenance import router as maintenance_router


app = FastAPI(title="FactorAI API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(production_router)
app.include_router(factory_router)
app.include_router(dashboard_router)
app.include_router(ai_router)
app.include_router(anomalies_router)
app.include_router(maintenance_router)


@app.get("/")
def root():
    return {
        "message": "FactorAI API is running"
    }


@app.get("/db-test")
def database_test():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

        return {
            "database": "connected",
            "result": result.scalar()
        }