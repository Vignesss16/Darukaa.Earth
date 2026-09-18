from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import activity, auth, metrics, projects, sites
from app.seed import seed_initial_data
from app.services.audit import register_audit_event_listeners

# Ensure DB tables exist on startup, seed default data, and register audit listeners
Base.metadata.create_all(bind=engine)
seed_initial_data()
register_audit_event_listeners()

app = FastAPI(
    title="Darukaa.Earth Operations API",
    description="""
### Darukaa.Earth — Carbon & Biodiversity Site Operations Platform API

This API powers the internal operations console for carbon and biodiversity site administrators:
- **Authentication & RBAC**: JWT access/refresh token rotation, bcrypt password hashing, and Admin/Analyst/Viewer role enforcement.
- **Projects**: Management of conservation project containers.
- **Spatial Sites**: GeoJSON Polygon capture, PostGIS geometry indexing (GIST), and automated geodesic surface area calculations in hectares.
- **Analytics & Degradation Alerts**: NDVI time-series satellite signals and automated consecutive reading change alert engine (>10% drop threshold).
- **Audit Logging & Activity Feed**: System activity audit logs with plain-language activity summaries.
""",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for local dev & production frontend (configurable via ALLOWED_ORIGINS env var)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(sites.router)
app.include_router(metrics.router)
app.include_router(activity.router)


@app.get(
    "/",
    summary="API Root",
    description="Welcome to Darukaa.Earth Operations API.",
)
def root():
    """API root endpoint providing status and documentation link."""
    return {
        "name": "Darukaa.Earth Operations API",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }


@app.get(
    "/health",
    status_code=200,
    summary="System health check",
    description="Verify backend server operation status.",
)
def health_check():
    """System health check endpoint."""
    return {"status": "ok"}
