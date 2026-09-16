from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import MetricType, Site, SiteMetric, User, UserRole
from app.schemas import SiteMetricCreate, SiteMetricOut
from app.services.alerts import (
    detect_degradation_alerts_for_site,
    get_all_active_degradation_alerts,
)
from app.services.metrics import seed_site_historical_metrics

router = APIRouter(tags=["Analytics & Alerts"])


@router.get(
    "/api/v1/sites/{site_id}/metrics",
    response_model=List[SiteMetricOut],
    summary="Get site time-series metrics",
    description="Retrieve historical time-series metric readings for Chart.js rendering (NDVI, Canopy Cover, Carbon Tons, Biodiversity Index).",
)
def get_site_metrics(
    site_id: int,
    metric_type: Optional[MetricType] = Query(
        None, description="Filter by metric type"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve historical metric readings for a site."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} was not found.",
        )

    query = db.query(SiteMetric).filter(SiteMetric.site_id == site_id)
    if metric_type:
        query = query.filter(SiteMetric.metric_type == metric_type)

    return query.order_by(SiteMetric.recorded_at.asc()).all()


@router.post(
    "/api/v1/sites/{site_id}/metrics",
    response_model=SiteMetricOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest new site metric reading",
    description="Record a new time-series metric reading for a site. Requires Admin or Analyst role permissions.",
)
def create_site_metric(
    site_id: int,
    metric_in: SiteMetricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ANALYST])),
):
    """Record a new metric entry for a site."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} was not found.",
        )

    metric = SiteMetric(
        site_id=site_id,
        metric_type=metric_in.metric_type,
        value=metric_in.value,
        recorded_at=metric_in.recorded_at,
        source=metric_in.source,
    )

    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.post(
    "/api/v1/sites/{site_id}/seed-metrics",
    response_model=List[SiteMetricOut],
    status_code=status.HTTP_201_CREATED,
    summary="Seed 12-month historical time-series data",
    description="Generate 12 months of historical seasonal NDVI and canopy cover data. Requires Admin or Analyst role permissions.",
)
def seed_metrics(
    site_id: int,
    include_spike: bool = Query(
        False, description="Inject a >10% degradation drop to trigger alert logic"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ANALYST])),
):
    """Seed historical metrics for site analytics testing."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} was not found.",
        )

    metrics = seed_site_historical_metrics(
        db, site_id, include_degradation_spike=include_spike
    )
    return metrics


@router.get(
    "/api/v1/alerts",
    response_model=List[Dict[str, Any]],
    summary="List active degradation alerts",
    description="Surface degradation alerts where canopy cover or NDVI dropped >10% between consecutive readings.",
)
def list_alerts(
    site_id: Optional[int] = Query(
        None, description="Filter alerts for a specific site"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Surface active degradation alerts across mapped sites."""
    if site_id is not None:
        site = db.query(Site).filter(Site.id == site_id).first()
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID {site_id} was not found.",
            )
        return detect_degradation_alerts_for_site(db, site)

    return get_all_active_degradation_alerts(db)
