from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, projects, sites

# Ensure DB tables exist on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Darukaa.Earth Operations API",
    description="""
### Darukaa.Earth — Carbon & Biodiversity Site Operations Platform API

This API powers the internal operations console for carbon and biodiversity site administrators:
- **Authentication & RBAC**: JWT access/refresh token rotation, bcrypt password hashing, and Admin/Analyst/Viewer role enforcement.
- **Projects**: Management of conservation project containers.
- **Spatial Sites**: GeoJSON Polygon capture, PostGIS geometry indexing (GIST), and automated geodesic surface area calculations in hectares.
""",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Enable CORS for local dev & production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(sites.router)


@app.get(
    "/health",
    status_code=200,
    summary="System health check",
    description="Verify backend server operation status.",
)
def health_check():
    """System health check endpoint."""
    return {"status": "ok"}
