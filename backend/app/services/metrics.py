import math
import random
from datetime import date, timedelta
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models import MetricType, SiteMetric


def fetch_sentinel2_ndvi_live(geojson_polygon: Dict[str, Any]) -> float:
    """
    DOCUMENTED PLACEHOLDER FOR LIVE SATELLITE INTEGRATION.

    In production, this function integrates with the Sentinel Hub API or Google Earth Engine API
    to ingest Sentinel-2 L2A surface reflectance imagery for the provided site GeoJSON polygon
    coordinates, computing the normalized difference vegetation index:
        NDVI = (B8_NIR - B4_Red) / (B8_NIR + B4_Red)

    To swap in live satellite ingestion:
    1. Pass `geojson_polygon` to `sentinelhub.SentinelHubRequest` or `ee.ImageCollection("COPERNICUS/S2_SR")`.
    2. Replace the return statement below with `live_ndvi_float`.
    """
    # Current fallback: return simulated base reading between 0.65 and 0.85
    return round(random.uniform(0.65, 0.85), 4)


def generate_seasonal_ndvi(month_offset: int, base_ndvi: float = 0.72) -> float:
    """
    Generate seasonal NDVI vegetation health values using a sine wave model + minor noise.
    Seasonal peak occurs in summer/monsoon months (sin wave amplitude ~0.12).
    """
    # 12-month cyclical sine wave
    seasonal_factor = 0.12 * math.sin((month_offset / 12.0) * 2 * math.pi)
    noise = random.uniform(-0.02, 0.02)
    ndvi_val = max(0.1, min(0.98, base_ndvi + seasonal_factor + noise))
    return round(ndvi_val, 4)


def generate_canopy_cover(month_offset: int, base_canopy: float = 82.0) -> float:
    """Generate canopy cover percentage time series."""
    seasonal_factor = 4.5 * math.sin((month_offset / 12.0) * 2 * math.pi)
    noise = random.uniform(-1.0, 1.0)
    canopy_val = max(10.0, min(100.0, base_canopy + seasonal_factor + noise))
    return round(canopy_val, 2)


def seed_site_historical_metrics(
    db: Session, site_id: int, include_degradation_spike: bool = False
) -> List[SiteMetric]:
    """
    Seed 12 months of historical time-series metrics (NDVI, Canopy Cover, Carbon Tons, Biodiversity Index).
    If `include_degradation_spike` is True, injects a >10% canopy drop in recent months to test alert logic.
    """
    today = date.today()
    created_metrics = []

    # Generate 12 monthly historical points
    for i in range(12, 0, -1):
        record_date = today - timedelta(days=i * 30)
        month_idx = 12 - i

        # Base calculations
        ndvi_val = generate_seasonal_ndvi(month_idx)
        canopy_val = generate_canopy_cover(month_idx)

        # Inject degradation drop if requested for alert testing (e.g. month offset 10 drops 15%)
        if include_degradation_spike and i <= 2:
            canopy_val = round(canopy_val * 0.84, 2)  # 16% drop
            ndvi_val = round(ndvi_val * 0.85, 4)  # 15% drop

        carbon_val = round(canopy_val * 4.2 + random.uniform(10, 30), 2)
        biodiversity_val = round(ndvi_val * 100.0 * 0.9, 1)

        metrics_data = [
            (MetricType.NDVI, ndvi_val, "satellite_sentinel2_mock"),
            (MetricType.CANOPY_COVER, canopy_val, "satellite_sentinel2_mock"),
            (MetricType.CARBON_TONS, carbon_val, "derived_mrv_model"),
            (MetricType.BIODIVERSITY_INDEX, biodiversity_val, "field_survey"),
        ]

        for m_type, val, src in metrics_data:
            metric = SiteMetric(
                site_id=site_id,
                metric_type=m_type,
                value=val,
                recorded_at=record_date,
                source=src,
            )
            db.add(metric)
            created_metrics.append(metric)

    db.commit()
    return created_metrics
