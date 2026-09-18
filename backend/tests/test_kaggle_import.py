import os
import tempfile
from datetime import date
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import MetricType, SiteMetric
from scripts.import_kaggle_data import (
    PROJECT_NAME,
    get_or_create_project_and_sites,
    import_deforestation_csv,
    import_fires_csv,
)


def test_kaggle_importer_workflow(db_session: Session):
    # 1. Test project and 9 sites creation
    project, sites_by_code = get_or_create_project_and_sites(db_session)
    assert project.name == PROJECT_NAME
    assert len(sites_by_code) == 9
    assert "AC" in sites_by_code
    assert "AM" in sites_by_code

    # 2. Test wide-format deforestation CSV
    sample_def_csv = """Ano/Estados,AC,AM,AP,MA,MT,PA,RO,RR,TO,AMZ LEGAL
2018,444,1045,24,253,1490,2744,1316,195,25,7536
2019,688,1421,8,215,1685,3862,1245,617,21,9762
"""
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".csv") as f:
        f.write(sample_def_csv)
        tmp_def_path = Path(f.name)

    try:
        inserted_def = import_deforestation_csv(db_session, tmp_def_path, sites_by_code)
        # 9 states * 2 years = 18 metrics
        assert inserted_def == 18

        # Verify Acre 2018 value
        acre_site = sites_by_code["AC"]
        metric_acre_2018 = (
            db_session.query(SiteMetric)
            .filter(
                SiteMetric.site_id == acre_site.id,
                SiteMetric.metric_type == MetricType.DEFORESTATION_AREA_KM2,
                SiteMetric.recorded_at == date(2018, 1, 1),
            )
            .first()
        )
        assert metric_acre_2018 is not None
        assert float(metric_acre_2018.value) == 444.0

        # Test idempotency (re-running should insert 0 new)
        re_run = import_deforestation_csv(db_session, tmp_def_path, sites_by_code)
        assert re_run == 0
    finally:
        if tmp_def_path.exists():
            os.unlink(tmp_def_path)

    # 3. Test long-format fires CSV
    sample_fires_csv = """year,state,month,number,date
2018,Acre,Janeiro,10,2018-01-01
2018,Acre,Fevereiro,15,2018-02-01
2019,Acre,Agosto,120,2019-08-01
2019,Amazonas,Setembro,500,2019-09-01
"""
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".csv") as f:
        f.write(sample_fires_csv)
        tmp_fires_path = Path(f.name)

    try:
        inserted_fires = import_fires_csv(db_session, tmp_fires_path, sites_by_code)
        # Acre 2018 (sum: 25), Acre 2019 (sum: 120), Amazonas 2019 (sum: 500) = 3 metrics
        assert inserted_fires == 3

        # Verify Acre 2018 fires
        fire_acre_2018 = (
            db_session.query(SiteMetric)
            .filter(
                SiteMetric.site_id == acre_site.id,
                SiteMetric.metric_type == MetricType.FIRE_INCIDENTS,
                SiteMetric.recorded_at == date(2018, 1, 1),
            )
            .first()
        )
        assert fire_acre_2018 is not None
        assert float(fire_acre_2018.value) == 25.0
    finally:
        if tmp_fires_path.exists():
            os.unlink(tmp_fires_path)
