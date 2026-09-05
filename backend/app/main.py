from fastapi import FastAPI

app = FastAPI(title="FactorAI API")


@app.get("/")
def root():
    return {
        "message": "FactorAI API is running"
    }