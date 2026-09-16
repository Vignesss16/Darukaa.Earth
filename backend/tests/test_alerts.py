from datetime import date, timedelta


def _get_admin_headers(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "alert_tester@darukaa.earth",
            "password": "Password123!",
            "full_name": "Alert Tester",
            "role": "admin",
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "alert_tester@darukaa.earth", "password": "Password123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_alert_threshold_logic(client):
    """Test degradation alert threshold logic (>10% drop vs <=10% drop)."""
    headers = _get_admin_headers(client)

    # Create project & site
    p_res = client.post(
        "/api/v1/projects", json={"name": "Alert Test Project"}, headers=headers
    )
    proj_id = p_res.json()["id"]

    poly = {
        "type": "Polygon",
        "coordinates": [
            [[75.8, 11.25], [75.85, 11.25], [75.85, 11.3], [75.8, 11.3], [75.8, 11.25]]
        ],
    }

    s_res = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Wayanad Sector 3",
            "site_type": "carbon",
            "geojson": poly,
        },
        headers=headers,
    )
    site_id = s_res.json()["id"]

    today = date.today()

    # 1. Ingest baseline reading: 85% canopy cover in March
    m1 = client.post(
        f"/api/v1/sites/{site_id}/metrics",
        json={
            "metric_type": "canopy_cover",
            "value": 85.0,
            "recorded_at": (today - timedelta(days=60)).isoformat(),
            "source": "satellite_sentinel2_mock",
        },
        headers=headers,
    )
    assert m1.status_code == 201

    # 2. Ingest minor drop: 81% canopy cover (4.7% drop) -> Should NOT trigger alert
    m2 = client.post(
        f"/api/v1/sites/{site_id}/metrics",
        json={
            "metric_type": "canopy_cover",
            "value": 81.0,
            "recorded_at": (today - timedelta(days=30)).isoformat(),
            "source": "satellite_sentinel2_mock",
        },
        headers=headers,
    )
    assert m2.status_code == 201

    alerts_minor = client.get(
        f"/api/v1/alerts?site_id={site_id}", headers=headers
    ).json()
    assert len(alerts_minor) == 0

    # 3. Ingest major degradation drop: 69% canopy cover (14.8% drop relative to 81%) -> SHOULD trigger alert
    m3 = client.post(
        f"/api/v1/sites/{site_id}/metrics",
        json={
            "metric_type": "canopy_cover",
            "value": 69.0,
            "recorded_at": today.isoformat(),
            "source": "satellite_sentinel2_mock",
        },
        headers=headers,
    )
    assert m3.status_code == 201

    alerts_major = client.get(
        f"/api/v1/alerts?site_id={site_id}", headers=headers
    ).json()
    assert len(alerts_major) >= 1
    alert = alerts_major[0]
    assert alert["metric_type"] == "canopy_cover"
    assert alert["drop_percentage"] >= 10.0
    assert "Canopy cover dropped" in alert["message"]
    assert "at Wayanad Sector 3 since" in alert["message"]
