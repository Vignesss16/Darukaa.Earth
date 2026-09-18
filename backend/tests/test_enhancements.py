import pytest
from fastapi.testclient import TestClient


def _get_auth_headers(client, email="admin_enhancement@darukaa.earth", role="admin"):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "AdminPassword123!",
            "full_name": "Enhancement Admin",
            "role": role,
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "AdminPassword123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_token_headers(client: TestClient):
    return _get_auth_headers(client)


def test_bulk_import_sites(client: TestClient, admin_token_headers: dict):
    # Create project first
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": "Bulk Test Project", "description": "Test bulk site import"},
        headers=admin_token_headers,
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    feature_collection = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Bulk Site 1"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [75.80, 11.25],
                            [75.82, 11.25],
                            [75.82, 11.27],
                            [75.80, 11.27],
                            [75.80, 11.25],
                        ]
                    ],
                },
            },
            {
                "type": "Feature",
                "properties": {"name": "Bulk Site 2"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [75.85, 11.30],
                            [75.87, 11.30],
                            [75.87, 11.32],
                            [75.85, 11.32],
                            [75.85, 11.30],
                        ]
                    ],
                },
            },
        ],
    }

    res = client.post(
        "/api/v1/sites/bulk",
        json={"project_id": proj_id, "feature_collection": feature_collection},
        headers=admin_token_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["imported_count"] == 2
    assert len(data["sites"]) == 2
    assert data["project_id"] == proj_id


def test_project_summary_rollup(client: TestClient, admin_token_headers: dict):
    # Create project
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": "Summary Test Project", "description": "Test rollup summary"},
        headers=admin_token_headers,
    )
    proj_id = proj_res.json()["id"]

    # Create 2 sites
    polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [75.80, 11.25],
                [75.82, 11.25],
                [75.82, 11.27],
                [75.80, 11.27],
                [75.80, 11.25],
            ]
        ],
    }
    client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Site Alpha",
            "site_type": "carbon",
            "geojson": polygon,
        },
        headers=admin_token_headers,
    )
    client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Site Beta",
            "site_type": "biodiversity",
            "geojson": polygon,
        },
        headers=admin_token_headers,
    )

    res = client.get(f"/api/v1/projects/{proj_id}/summary", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["project_id"] == proj_id
    assert data["total_sites"] == 2
    assert "carbon" in data["sites_by_classification"]
    assert len(data["site_summaries"]) == 2


def test_site_comparison(client: TestClient, admin_token_headers: dict):
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": "Compare Test Project"},
        headers=admin_token_headers,
    )
    proj_id = proj_res.json()["id"]

    polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [75.80, 11.25],
                [75.82, 11.25],
                [75.82, 11.27],
                [75.80, 11.27],
                [75.80, 11.25],
            ]
        ],
    }
    s1 = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Comp Site 1",
            "site_type": "carbon",
            "geojson": polygon,
        },
        headers=admin_token_headers,
    ).json()

    s2 = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Comp Site 2",
            "site_type": "mixed",
            "geojson": polygon,
        },
        headers=admin_token_headers,
    ).json()

    res = client.post(
        "/api/v1/sites/compare",
        json={"site_ids": [s1["id"], s2["id"]]},
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["sites"]) == 2
    assert str(s1["id"]) in [str(k) for k in data["metrics_by_site"].keys()]


def test_scoped_ai_assistant(client: TestClient, admin_token_headers: dict):
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": "AI Test Project"},
        headers=admin_token_headers,
    )
    proj_id = proj_res.json()["id"]

    polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [75.80, 11.25],
                [75.82, 11.25],
                [75.82, 11.27],
                [75.80, 11.27],
                [75.80, 11.25],
            ]
        ],
    }
    site = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "AI Site",
            "site_type": "carbon",
            "geojson": polygon,
        },
        headers=admin_token_headers,
    ).json()

    res = client.post(
        f"/api/v1/sites/{site['id']}/assistant/chat",
        json={"message": "What is the health status of this site?"},
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert data["site_id"] == site["id"]
    assert data["is_ai_generated"] is True


def test_scoped_ai_assistant_long_history(
    client: TestClient, admin_token_headers: dict
):
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": "AI Long History Project"},
        headers=admin_token_headers,
    )
    proj_id = proj_res.json()["id"]

    polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [75.80, 11.25],
                [75.82, 11.25],
                [75.82, 11.27],
                [75.80, 11.27],
                [75.80, 11.25],
            ]
        ],
    }
    site = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "AI Long History Site",
            "site_type": "carbon",
            "geojson": polygon,
        },
        headers=admin_token_headers,
    ).json()

    long_analysis = "Telemetry breakdown and audit: " + (
        "NDVI 0.78 stable canopy; " * 300
    )
    assert len(long_analysis) > 5000

    res = client.post(
        f"/api/v1/sites/{site['id']}/assistant/chat",
        json={
            "message": "pdf report?",
            "history": [
                {"role": "user", "content": "analysis"},
                {"role": "assistant", "content": long_analysis},
            ],
        },
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "response" in data


def test_bulk_metrics_import(client: TestClient, admin_token_headers: dict):
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": "Bulk Metrics Project", "description": "Testing bulk metrics"},
        headers=admin_token_headers,
    )
    proj_id = proj_res.json()["id"]

    polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [-70.5, -9.0],
                [-70.0, -9.0],
                [-70.0, -8.5],
                [-70.5, -8.5],
                [-70.5, -9.0],
            ]
        ],
    }
    site = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Amazonas Sector",
            "site_type": "mixed",
            "geojson": polygon,
        },
        headers=admin_token_headers,
    ).json()

    bulk_data = [
        {
            "metric_type": "deforestation_area_km2",
            "value": 1250.5,
            "recorded_at": "2019-01-01T00:00:00Z",
            "source": "INPE PRODES",
        },
        {
            "metric_type": "fire_incidents",
            "value": 3420,
            "recorded_at": "2019-01-01T00:00:00Z",
            "source": "INPE BDQueimadas",
        },
    ]

    res = client.post(
        f"/api/v1/sites/{site['id']}/metrics/bulk",
        json=bulk_data,
        headers=admin_token_headers,
    )
    assert res.status_code == 201
    result = res.json()
    assert len(result) == 2
    assert result[0]["metric_type"] == "deforestation_area_km2"
    assert result[0]["value"] == 1250.5
    assert result[1]["metric_type"] == "fire_incidents"
    assert result[1]["value"] == 3420
