from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.geometry import shape as shapely_shape

from app.models import MetricType, ProjectStatus, SiteType, UserRole


# ==========================================
# User & Auth Schemas
# ==========================================
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: Optional[UserRole] = UserRole.VIEWER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    created_at: Optional[datetime] = None


# ==========================================
# Project Schemas
# ==========================================
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = ProjectStatus.ACTIVE


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    status: ProjectStatus
    created_at: Optional[datetime] = None
    site_count: Optional[int] = 0


# ==========================================
# Site & Geometry Schemas
# ==========================================
class SiteCreate(BaseModel):
    project_id: int
    name: str = Field(..., min_length=2, max_length=255)
    site_type: SiteType = SiteType.MIXED
    geojson: Dict[str, Any]

    @field_validator("geojson")
    @classmethod
    def validate_geojson_polygon(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(v, dict):
            raise ValueError("GeoJSON must be a JSON object")

        geom_type = v.get("type")
        if geom_type != "Polygon":
            raise ValueError(f"Geometry type must be 'Polygon', got '{geom_type}'")

        coordinates = v.get("coordinates")
        if not isinstance(coordinates, list) or len(coordinates) == 0:
            raise ValueError("Polygon coordinates must be a non-empty array of rings")

        exterior = coordinates[0]
        if not isinstance(exterior, list) or len(exterior) < 4:
            raise ValueError(
                "Polygon exterior ring must contain at least 4 coordinate points (3 vertices + 1 closing point)"
            )

        # Check closing point matches start point
        if exterior[0] != exterior[-1]:
            raise ValueError("Polygon exterior ring start point must equal end point")

        # Validate with Shapely for self-intersections, bowties, and geometric validity
        try:
            shapely_geom = shapely_shape(v)
        except Exception as e:
            raise ValueError(f"Malformed GeoJSON geometry structure: {str(e)}")

        if not isinstance(shapely_geom, ShapelyPolygon):
            raise ValueError("GeoJSON shape could not be parsed into a valid Polygon")

        if shapely_geom.is_empty:
            raise ValueError("Polygon geometry cannot be empty")

        if not shapely_geom.is_valid:
            raise ValueError(
                "Invalid polygon geometry: boundary self-intersects or contains invalid loops"
            )

        if shapely_geom.area <= 0:
            raise ValueError("Polygon must have a non-zero positive spatial area")

        return v


class SiteUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    site_type: Optional[SiteType] = None
    geojson: Optional[Dict[str, Any]] = None

    @field_validator("geojson")
    @classmethod
    def validate_optional_geojson(
        cls, v: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        if v is not None:
            return SiteCreate.validate_geojson_polygon(v)
        return v


class SiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    area_hectares: Optional[float] = None
    site_type: SiteType
    geojson: Dict[str, Any]
    created_at: Optional[datetime] = None


# ==========================================
# Site Metrics Schemas
# ==========================================
class SiteMetricCreate(BaseModel):
    metric_type: MetricType
    value: float
    recorded_at: date
    source: str = "manual"


class SiteMetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    site_id: int
    metric_type: MetricType
    value: float
    recorded_at: date
    source: str
