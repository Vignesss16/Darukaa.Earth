import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import mapping
from shapely.geometry import shape as shapely_shape
from shapely.wkt import loads as wkt_loads
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import Project, Site, SiteType, User, UserRole
from app.schemas import SiteCreate, SiteOut, SiteUpdate

router = APIRouter(prefix="/api/v1/sites", tags=["Sites"])


def _site_to_out(site: Site) -> SiteOut:
    """Helper to convert Site database model to SiteOut schema with GeoJSON dict."""
    try:
        if isinstance(site.geom, str):
            if site.geom.startswith("{"):
                shapely_g = shapely_shape(json.loads(site.geom))
            else:
                shapely_g = wkt_loads(site.geom)
            geojson_dict = mapping(shapely_g)
        elif hasattr(site.geom, "data"):
            shapely_g = to_shape(site.geom)
            geojson_dict = mapping(shapely_g)
        else:
            shapely_g = to_shape(site.geom)
            geojson_dict = mapping(shapely_g)
    except Exception:
        geojson_dict = {"type": "Polygon", "coordinates": []}

    area = float(site.area_hectares) if site.area_hectares is not None else None

    return SiteOut(
        id=site.id,
        project_id=site.project_id,
        name=site.name,
        area_hectares=area,
        site_type=site.site_type,
        geojson=geojson_dict,
        created_at=site.created_at,
    )


@router.get(
    "",
    response_model=List[SiteOut],
    summary="List spatial conservation sites",
    description="Retrieve all conservation sites, optionally filtered by parent project_id or site_type (carbon, biodiversity, mixed).",
)
def list_sites(
    project_id: Optional[int] = Query(
        None, description="Filter sites belonging to a specific project"
    ),
    site_type: Optional[SiteType] = Query(
        None, description="Filter by site type (carbon/biodiversity/mixed)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List conservation sites with PostGIS geometry converted to standard GeoJSON."""
    query = db.query(Site)
    if project_id is not None:
        query = query.filter(Site.project_id == project_id)
    if site_type is not None:
        query = query.filter(Site.site_type == site_type)

    sites = query.order_by(Site.created_at.desc()).all()
    return [_site_to_out(site) for site in sites]


@router.post(
    "",
    response_model=SiteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create conservation site with polygon capture",
    description="""
Create a new spatial conservation site with a GeoJSON Polygon boundary.
Validates spatial geometry for self-intersections and non-closed rings, converts to PostGIS polygon,
and automatically calculates geodesic surface area in hectares.
Requires Admin or Analyst role permissions.
""",
)
def create_site(
    site_in: SiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ANALYST])),
):
    """Create a new spatial site with PostGIS geometry and geodesic area calculation."""
    # Verify project exists
    project = db.query(Project).filter(Project.id == site_in.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent project with ID {site_in.project_id} was not found.",
        )

    # Convert validated GeoJSON dict to Shapely shape and GeoAlchemy2 / WKT element
    try:
        s_geom = shapely_shape(site_in.geojson)
        dialect_name = db.bind.dialect.name if db.bind else "postgresql"
        if dialect_name == "sqlite":
            geo_element = s_geom.wkt
        else:
            geo_element = from_shape(s_geom, srid=4326)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed GeoJSON polygon geometry: {str(e)}",
        )

    # Calculate area in hectares via PostGIS ST_Area over geography if PostGIS engine active,
    # or fallback approximation using Shapely
    try:
        area_query = db.query(
            func.ST_Area(
                func.ST_SetSRID(
                    func.ST_GeomFromGeoJSON(json.dumps(site_in.geojson)), 4326
                ),
                True,
            )
        ).scalar()
        area_ha = round(area_query / 10000.0, 4) if area_query else None
    except Exception:
        # Fallback metric area estimation
        area_ha = round((s_geom.area * 111000 * 111000) / 10000.0, 4)

    site = Site(
        project_id=site_in.project_id,
        name=site_in.name,
        geom=geo_element,
        area_hectares=area_ha,
        site_type=site_in.site_type,
    )

    db.add(site)
    db.commit()
    db.refresh(site)

    return _site_to_out(site)


@router.get(
    "/{site_id}",
    response_model=SiteOut,
    summary="Get site details",
    description="Retrieve single spatial conservation site details, including GeoJSON polygon coordinates and calculated area.",
)
def get_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve detailed spatial site properties by site ID."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conservation site with ID {site_id} was not found.",
        )
    return _site_to_out(site)


@router.put(
    "/{site_id}",
    response_model=SiteOut,
    summary="Update site properties or boundary",
    description="Modify site name, site type, or polygon geometry boundary. Recalculates area if boundary changes.",
)
def update_site(
    site_id: int,
    site_in: SiteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ANALYST])),
):
    """Update site properties or polygon boundary with automatic area recalculation."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conservation site with ID {site_id} was not found.",
        )

    if site_in.name is not None:
        site.name = site_in.name
    if site_in.site_type is not None:
        site.site_type = site_in.site_type
    if site_in.geojson is not None:
        s_geom = shapely_shape(site_in.geojson)
        dialect_name = db.bind.dialect.name if db.bind else "postgresql"
        if dialect_name == "sqlite":
            site.geom = s_geom.wkt
        else:
            site.geom = from_shape(s_geom, srid=4326)

        try:
            area_query = db.query(
                func.ST_Area(
                    func.ST_SetSRID(
                        func.ST_GeomFromGeoJSON(json.dumps(site_in.geojson)), 4326
                    ),
                    True,
                )
            ).scalar()
            site.area_hectares = round(area_query / 10000.0, 4) if area_query else None
        except Exception:
            site.area_hectares = round((s_geom.area * 111000 * 111000) / 10000.0, 4)

    db.commit()
    db.refresh(site)
    return _site_to_out(site)


@router.delete(
    "/{site_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete site",
    description="Remove a conservation site from the database. Requires Admin role permissions.",
)
def delete_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Permanently delete a conservation site."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conservation site with ID {site_id} was not found.",
        )
    db.delete(site)
    db.commit()
    return None
