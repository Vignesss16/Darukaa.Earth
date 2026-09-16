from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models import MetricType, Site, SiteMetric


def detect_degradation_alerts_for_site(db: Session, site: Site) -> List[Dict[str, Any]]:
    """
    Feature B Alert Logic:
    Scans consecutive historical readings for `canopy_cover` and `ndvi` for a site.
    If value drops > 10% between two consecutive readings, returns a degradation alert payload
    with plain-language copy (e.g. 'Canopy cover dropped 14.2% at Wayanad Sector A since March').
    """
    alerts = []

    # Check for both Canopy Cover and NDVI degradation
    target_metric_types = [
        (MetricType.CANOPY_COVER, "Canopy cover", "%"),
        (MetricType.NDVI, "NDVI vegetation index", ""),
    ]

    for metric_type, metric_label, unit in target_metric_types:
        readings = (
            db.query(SiteMetric)
            .filter(
                SiteMetric.site_id == site.id,
                SiteMetric.metric_type == metric_type,
            )
            .order_by(SiteMetric.recorded_at.asc())
            .all()
        )

        if len(readings) < 2:
            continue

        # Evaluate consecutive readings
        for i in range(1, len(readings)):
            prev_r = readings[i - 1]
            curr_r = readings[i]

            prev_val = float(prev_r.value)
            curr_val = float(curr_r.value)

            if prev_val <= 0:
                continue

            # Calculate relative percentage drop
            relative_drop_pct = ((prev_val - curr_val) / prev_val) * 100.0

            if relative_drop_pct >= 10.0:
                month_name = prev_r.recorded_at.strftime("%B")
                drop_formatted = f"{relative_drop_pct:.1f}%"

                # Plain language copy as requested
                message = f"{metric_label} dropped {drop_formatted} at {site.name} since {month_name}"

                alerts.append(
                    {
                        "site_id": site.id,
                        "site_name": site.name,
                        "project_id": site.project_id,
                        "metric_type": metric_type.value,
                        "previous_value": prev_val,
                        "current_value": curr_val,
                        "drop_percentage": round(relative_drop_pct, 1),
                        "recorded_at": curr_r.recorded_at.isoformat(),
                        "previous_date": prev_r.recorded_at.isoformat(),
                        "message": message,
                        "severity": "degradation_alert",
                    }
                )

    return alerts


def get_all_active_degradation_alerts(db: Session) -> List[Dict[str, Any]]:
    """Scan all sites and surface active degradation alerts."""
    sites = db.query(Site).all()
    all_alerts = []
    for site in sites:
        site_alerts = detect_degradation_alerts_for_site(db, site)
        all_alerts.extend(site_alerts)
    return all_alerts
