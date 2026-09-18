#!/usr/bin/env python3
"""
Import script for Kaggle INPE Brazilian Amazon Deforestation & Fire Incidents dataset.

Dataset files expected in backend/data/kaggle/:
1. def_area_2004_2019.csv - Yearly deforestation area (km²) per Amazon state (PRODES)
2. inpe_brazilian_amazon_fires_1999_2019.csv - Fire incident counts per state/year (BDQueimadas)

Target project: "Brazilian Legal Amazon (INPE dataset)"
Target sites: 9 Brazilian Legal Amazon states with ~1-degree bounding boxes.
"""

import csv
import logging
import math
import sys
from datetime import date
from pathlib import Path

# Add backend root to sys.path so app modules can be imported
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = CURRENT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("kaggle_importer")

from geoalchemy2.shape import from_shape  # noqa: E402
from shapely.geometry import box  # noqa: E402
from sqlalchemy import func  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    MetricType,
    Project,
    Site,
    SiteMetric,
    SiteType,
    User,
    UserRole,
)

PROJECT_NAME = "Brazilian Legal Amazon (INPE dataset)"
PROJECT_DESC = (
    "Historical deforestation and fire incident telemetry across 9 Brazilian Legal "
    "Amazon states (INPE PRODES & BDQueimadas datasets 1999-2019)."
)

# 9 Brazilian Legal Amazon States with specified centroid coordinates
# Bounding box is ~1-degree around centroid: [lat ± 0.5, lon ± 0.5]
STATES_CONFIG = {
    "AC": {
        "name": "Acre (AC)",
        "lat": -9.0,
        "lon": -70.5,
        "aliases": ["acre", "ac"],
    },
    "AM": {
        "name": "Amazonas (AM)",
        "lat": -4.0,
        "lon": -63.0,
        "aliases": ["amazonas", "am"],
    },
    "AP": {
        "name": "Amapá (AP)",
        "lat": 1.5,
        "lon": -52.0,
        "aliases": ["amapa", "amapá", "ap"],
    },
    "MA": {
        "name": "Maranhão (MA)",
        "lat": -5.0,
        "lon": -45.5,
        "aliases": ["maranhao", "maranhão", "ma"],
    },
    "MT": {
        "name": "Mato Grosso (MT)",
        "lat": -12.5,
        "lon": -55.5,
        "aliases": ["mato grosso", "mt"],
    },
    "PA": {
        "name": "Pará (PA)",
        "lat": -4.5,
        "lon": -52.0,
        "aliases": ["para", "pará", "pa"],
    },
    "RO": {
        "name": "Rondônia (RO)",
        "lat": -10.9,
        "lon": -62.5,
        "aliases": ["rondonia", "rondônia", "ro"],
    },
    "RR": {
        "name": "Roraima (RR)",
        "lat": 2.0,
        "lon": -61.5,
        "aliases": ["roraima", "rr"],
    },
    "TO": {
        "name": "Tocantins (TO)",
        "lat": -10.0,
        "lon": -48.0,
        "aliases": ["tocantins", "to"],
    },
}


def find_data_dir() -> Path:
    """Locate data/kaggle directory either relative to script or in /app/data/kaggle."""
    candidates = [
        BACKEND_ROOT / "data" / "kaggle",
        Path("/app/data/kaggle"),
        Path("./data/kaggle").resolve(),
    ]
    for c in candidates:
        if c.exists() and c.is_dir():
            return c
    # Default fallback
    target = BACKEND_ROOT / "data" / "kaggle"
    target.mkdir(parents=True, exist_ok=True)
    return target


def calculate_area_ha(s_geom, db) -> float:
    """Calculate surface area in hectares using PostGIS ST_Area or geodesic fallback."""
    try:
        area_query = db.query(
            func.ST_Area(
                func.ST_SetSRID(func.ST_GeomFromText(s_geom.wkt), 4326),
                True,
            )
        ).scalar()
        if area_query:
            return round(area_query / 10000.0, 4)
    except Exception:
        pass

    centroid_lat = s_geom.centroid.y
    width_km = 111.32 * math.cos(math.radians(centroid_lat))
    height_km = 110.57
    return round(width_km * height_km * 100.0, 4)


def get_or_create_project_and_sites(db) -> tuple[Project, dict[str, Site]]:
    """Idempotently retrieve or create the Brazilian Legal Amazon project and 9 state sites."""
    project = db.query(Project).filter(Project.name == PROJECT_NAME).first()
    if not project:
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin_user:
            admin_user = db.query(User).first()
        if not admin_user:
            from app.auth import get_password_hash

            admin_user = User(
                email="admin@darukaa.earth",
                hashed_password=get_password_hash("admin123"),
                full_name="Admin User",
                role=UserRole.ADMIN,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        project = Project(
            name=PROJECT_NAME,
            description=PROJECT_DESC,
            owner_id=admin_user.id,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        logger.info(f"Created project '{PROJECT_NAME}' (ID: {project.id})")
    else:
        logger.info(f"Found existing project '{PROJECT_NAME}' (ID: {project.id})")

    sites_by_code: dict[str, Site] = {}
    for code, cfg in STATES_CONFIG.items():
        site = (
            db.query(Site)
            .filter(Site.project_id == project.id, Site.name == cfg["name"])
            .first()
        )
        if not site:
            # Create ~1-degree bounding box around centroid
            lat, lon = cfg["lat"], cfg["lon"]
            s_box = box(lon - 0.5, lat - 0.5, lon + 0.5, lat + 0.5)
            dialect_name = db.bind.dialect.name if db.bind else "postgresql"
            if dialect_name == "sqlite":
                geom_val = s_box.wkt
            else:
                geom_val = from_shape(s_box, srid=4326)

            area_ha = calculate_area_ha(s_box, db)
            site = Site(
                project_id=project.id,
                name=cfg["name"],
                geom=geom_val,
                area_hectares=area_ha,
                site_type=SiteType.MIXED,
            )
            db.add(site)
            db.commit()
            db.refresh(site)
            logger.info(
                f"  -> Created site '{cfg['name']}' (ID: {site.id}, {area_ha:,.1f} ha)"
            )
        else:
            logger.info(f"  -> Found existing site '{cfg['name']}' (ID: {site.id})")

        sites_by_code[code] = site

    return project, sites_by_code


def parse_clean_float(val: str) -> float | None:
    """Parse numeric string with commas/dots into float."""
    if not val:
        return None
    val = val.strip().replace(" ", "")
    if not val or val.lower() in ("nan", "null", "none", "-"):
        return None
    # Handle Brazilian number formats: "1.234,56" or standard "1,234.56"
    if "," in val and "." in val:
        if val.rfind(",") > val.rfind("."):
            val = val.replace(".", "").replace(",", ".")
        else:
            val = val.replace(",", "")
    elif "," in val:
        val = val.replace(",", ".")
    try:
        return float(val)
    except ValueError:
        return None


def detect_delimiter(file_path: Path) -> str:
    """Detect CSV delimiter (comma, semicolon, or tab)."""
    with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
        first_line = f.readline()
        if ";" in first_line and first_line.count(";") > first_line.count(","):
            return ";"
        if "\t" in first_line:
            return "\t"
        return ","


EXCLUDED_HEADERS = {
    "amz legal",
    "amz_legal",
    "amazonia legal",
    "amazônia legal",
    "total",
    "brasil",
    "brazil",
}


def match_state_code(raw_name: str) -> str | None:
    """Match a string column header or value to one of the 9 state codes."""
    cleaned = raw_name.strip().lower().replace('"', "").replace("'", "")
    if cleaned in EXCLUDED_HEADERS:
        return None

    cleaned_upper = raw_name.strip().upper()
    if cleaned_upper in STATES_CONFIG:
        return cleaned_upper

    for code, cfg in STATES_CONFIG.items():
        for alias in cfg["aliases"]:
            if cleaned == alias:
                return code
            if len(alias) > 2 and alias in cleaned:
                return code
    return None


def import_deforestation_csv(
    db, file_path: Path, sites_by_code: dict[str, Site]
) -> int:
    """Import yearly deforestation data (km²) from PRODES CSV."""
    logger.info(f"Processing deforestation CSV: {file_path.name}")
    delimiter = detect_delimiter(file_path)
    inserted_count = 0

    with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.reader(f, delimiter=delimiter)
        header = next(reader, None)
        if not header:
            logger.warning("Empty file.")
            return 0

        # Determine if Wide Format (Ano/Estados, AC, AM, ...) or Long Format
        header_clean = [h.strip() for h in header]
        year_idx = None
        state_cols: dict[int, str] = {}

        for i, col in enumerate(header_clean):
            col_lower = col.lower()
            if col_lower in ("ano", "year", "ano/estados", "ano / estados", "date"):
                year_idx = i
            else:
                matched_code = match_state_code(col)
                if matched_code:
                    state_cols[i] = matched_code

        if year_idx is not None and len(state_cols) >= 3:
            logger.info(f"Detected WIDE format with {len(state_cols)} state columns.")
            for row in reader:
                if not row or len(row) <= year_idx:
                    continue
                year_str = row[year_idx].strip()
                if not year_str.isdigit():
                    continue
                year = int(year_str)
                rec_date = date(year, 1, 1)

                for col_idx, state_code in state_cols.items():
                    if col_idx >= len(row):
                        continue
                    val = parse_clean_float(row[col_idx])
                    if val is None or val < 0:
                        continue

                    site = sites_by_code.get(state_code)
                    if not site:
                        continue

                    # Check if already recorded
                    exists = (
                        db.query(SiteMetric)
                        .filter(
                            SiteMetric.site_id == site.id,
                            SiteMetric.metric_type == MetricType.DEFORESTATION_AREA_KM2,
                            SiteMetric.recorded_at == rec_date,
                        )
                        .first()
                    )
                    if not exists:
                        metric = SiteMetric(
                            site_id=site.id,
                            metric_type=MetricType.DEFORESTATION_AREA_KM2,
                            value=val,
                            recorded_at=rec_date,
                            source="INPE PRODES",
                        )
                        db.add(metric)
                        inserted_count += 1
        else:
            # Long format check
            logger.info("Attempting LONG format parse (year, state, area)...")
            state_col_idx = None
            area_col_idx = None
            for i, col in enumerate(header_clean):
                col_l = col.lower()
                if col_l in ("ano", "year", "date"):
                    year_idx = i
                elif col_l in ("state", "estado", "uf"):
                    state_col_idx = i
                elif any(
                    k in col_l
                    for k in ("area", "desmatada", "deforestation", "val", "km2")
                ):
                    area_col_idx = i

            if (
                year_idx is not None
                and state_col_idx is not None
                and area_col_idx is not None
            ):
                for row in reader:
                    if len(row) <= max(year_idx, state_col_idx, area_col_idx):
                        continue
                    year_s = "".join(c for c in row[year_idx] if c.isdigit())
                    if not year_s or len(year_s) < 4:
                        continue
                    year = int(year_s[:4])
                    state_code = match_state_code(row[state_col_idx])
                    if not state_code or state_code not in sites_by_code:
                        continue
                    val = parse_clean_float(row[area_col_idx])
                    if val is None or val < 0:
                        continue

                    site = sites_by_code[state_code]
                    rec_date = date(year, 1, 1)
                    exists = (
                        db.query(SiteMetric)
                        .filter(
                            SiteMetric.site_id == site.id,
                            SiteMetric.metric_type == MetricType.DEFORESTATION_AREA_KM2,
                            SiteMetric.recorded_at == rec_date,
                        )
                        .first()
                    )
                    if not exists:
                        db.add(
                            SiteMetric(
                                site_id=site.id,
                                metric_type=MetricType.DEFORESTATION_AREA_KM2,
                                value=val,
                                recorded_at=rec_date,
                                source="INPE PRODES",
                            )
                        )
                        inserted_count += 1

    db.commit()
    logger.info(f"-> Inserted {inserted_count} deforestation metric rows.")
    return inserted_count


def import_fires_csv(db, file_path: Path, sites_by_code: dict[str, Site]) -> int:
    """Import fire incidents from BDQueimadas CSV (aggregated yearly per state)."""
    logger.info(f"Processing fires CSV: {file_path.name}")
    delimiter = detect_delimiter(file_path)
    inserted_count = 0

    # Aggregate by (state_code, year) -> total_fires
    yearly_fires: dict[tuple[str, int], float] = {}

    with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.reader(f, delimiter=delimiter)
        header = next(reader, None)
        if not header:
            return 0

        header_clean = [h.strip() for h in header]
        year_idx = None
        state_col_idx = None
        fires_col_idx = None

        # Check for wide or long
        state_cols: dict[int, str] = {}
        for i, col in enumerate(header_clean):
            col_l = col.lower()
            if col_l in ("ano", "year", "data", "date"):
                year_idx = i
            elif col_l in ("state", "estado", "uf"):
                state_col_idx = i
            elif any(
                k in col_l for k in ("number", "fires", "focos", "incidents", "count")
            ):
                fires_col_idx = i
            else:
                code = match_state_code(col)
                if code:
                    state_cols[i] = code

        if year_idx is not None and len(state_cols) >= 3:
            logger.info("Detected WIDE fires format.")
            for row in reader:
                if len(row) <= year_idx:
                    continue
                year_s = "".join(c for c in row[year_idx] if c.isdigit())
                if not year_s or len(year_s) < 4:
                    continue
                year = int(year_s[:4])
                for col_idx, code in state_cols.items():
                    if col_idx >= len(row):
                        continue
                    val = parse_clean_float(row[col_idx])
                    if val is not None and val >= 0:
                        key = (code, year)
                        yearly_fires[key] = yearly_fires.get(key, 0.0) + val
        elif (
            year_idx is not None
            and state_col_idx is not None
            and fires_col_idx is not None
        ):
            logger.info(
                "Detected LONG fires format (aggregating monthly/daily records per year)..."
            )
            for row in reader:
                if len(row) <= max(year_idx, state_col_idx, fires_col_idx):
                    continue
                year_s = "".join(c for c in row[year_idx] if c.isdigit())
                if not year_s or len(year_s) < 4:
                    continue
                year = int(year_s[:4])
                state_code = match_state_code(row[state_col_idx])
                if not state_code or state_code not in sites_by_code:
                    continue
                val = parse_clean_float(row[fires_col_idx])
                if val is not None and val >= 0:
                    key = (state_code, year)
                    yearly_fires[key] = yearly_fires.get(key, 0.0) + val
        else:
            logger.warning(f"Could not map header columns: {header_clean}")

    # Insert aggregated yearly fires into database
    for (state_code, year), total_count in sorted(yearly_fires.items()):
        site = sites_by_code.get(state_code)
        if not site:
            continue
        rec_date = date(year, 1, 1)
        exists = (
            db.query(SiteMetric)
            .filter(
                SiteMetric.site_id == site.id,
                SiteMetric.metric_type == MetricType.FIRE_INCIDENTS,
                SiteMetric.recorded_at == rec_date,
            )
            .first()
        )
        if not exists:
            db.add(
                SiteMetric(
                    site_id=site.id,
                    metric_type=MetricType.FIRE_INCIDENTS,
                    value=round(total_count, 1),
                    recorded_at=rec_date,
                    source="INPE BDQueimadas",
                )
            )
            inserted_count += 1

    db.commit()
    logger.info(f"-> Inserted {inserted_count} fire incident metric rows.")
    return inserted_count


def run():
    """Main execution entry point."""
    data_dir = find_data_dir()
    logger.info(f"Target Kaggle data directory: {data_dir}")

    def_file = data_dir / "def_area_2004_2019.csv"
    fires_file = data_dir / "inpe_brazilian_amazon_fires_1999_2019.csv"

    # Also search for any csv files with similar names in data_dir
    if not def_file.exists():
        for f in data_dir.glob("*def*.csv"):
            def_file = f
            break
    if not fires_file.exists():
        for f in data_dir.glob("*fire*.csv"):
            fires_file = f
            break

    files_found = []
    if def_file.exists() and def_file.is_file():
        files_found.append(def_file)
    if fires_file.exists() and fires_file.is_file():
        files_found.append(fires_file)

    if not files_found:
        logger.warning(
            "\n"
            "=========================================================================\n"
            " No Kaggle CSV dataset files detected yet in:\n"
            f"   {data_dir}\n\n"
            " Expected file names:\n"
            "   1. def_area_2004_2019.csv\n"
            "   2. inpe_brazilian_amazon_fires_1999_2019.csv\n\n"
            " Please place these CSV files into the folder above and re-run this script.\n"
            "=========================================================================\n"
        )
        return

    db = SessionLocal()
    try:
        project, sites_by_code = get_or_create_project_and_sites(db)

        total_def = 0
        total_fires = 0

        if def_file.exists():
            total_def = import_deforestation_csv(db, def_file, sites_by_code)
        else:
            logger.info("No deforestation CSV found; skipping deforestation import.")

        if fires_file.exists():
            total_fires = import_fires_csv(db, fires_file, sites_by_code)
        else:
            logger.info("No fires CSV found; skipping fires import.")

        logger.info(
            f"\n--- Ingestion Complete ---\n"
            f"Project: '{project.name}' (ID: {project.id})\n"
            f"Sites: {len(sites_by_code)} Amazon states\n"
            f"Deforestation Metrics Inserted: {total_def}\n"
            f"Fire Incident Metrics Inserted: {total_fires}\n"
        )
    finally:
        db.close()


if __name__ == "__main__":
    run()
