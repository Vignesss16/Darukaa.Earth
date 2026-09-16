from fastapi import FastAPI

app = FastAPI(
    title="Darukaa.Earth API",
    description="Backend API for Darukaa.Earth Carbon & Biodiversity Ops Platform",
    version="0.1.0",
)


@app.get("/health", status_code=200)
def health_check():
    return {"status": "ok"}
