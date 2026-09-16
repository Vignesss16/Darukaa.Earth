def _get_auth_headers(client, email="admin_test@darukaa.earth", role="admin"):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "AdminPassword123!",
            "full_name": "Test Admin",
            "role": role,
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "AdminPassword123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_project_crud(client):
    """Test full Project CRUD lifecycle."""
    headers = _get_auth_headers(client, "proj_owner@darukaa.earth", "admin")

    # 1. Create project
    create_res = client.post(
        "/api/v1/projects",
        json={
            "name": "Amazon Basin Carbon Reserve",
            "description": "High-density rainforest carbon sequestration monitoring site",
            "status": "active",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    proj_data = create_res.json()
    proj_id = proj_data["id"]
    assert proj_data["name"] == "Amazon Basin Carbon Reserve"
    assert proj_data["site_count"] == 0

    # 2. List projects
    list_res = client.get("/api/v1/projects", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 3. Get single project
    get_res = client.get(f"/api/v1/projects/{proj_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == proj_id

    # 4. Update project
    up_res = client.put(
        f"/api/v1/projects/{proj_id}",
        json={"name": "Updated Amazon Reserve", "status": "archived"},
        headers=headers,
    )
    assert up_res.status_code == 200
    assert up_res.json()["name"] == "Updated Amazon Reserve"
    assert up_res.json()["status"] == "archived"


def test_valid_site_creation_and_geojson_polygon(client):
    """Test creating a spatial site with a valid GeoJSON polygon."""
    headers = _get_auth_headers(client, "site_creator@darukaa.earth", "analyst")

    # Create project first
    p_res = client.post(
        "/api/v1/projects",
        json={"name": "Western Ghats Biodiversity Corridor"},
        headers=headers,
    )
    proj_id = p_res.json()["id"]

    # Valid closed polygon: 4 vertices (3 distinct points + closing point)
    valid_polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [75.80, 11.25],
                [75.85, 11.25],
                [75.85, 11.30],
                [75.80, 11.30],
                [75.80, 11.25],
            ]
        ],
    }

    site_payload = {
        "project_id": proj_id,
        "name": "Wayanad Primary Canopy Zone",
        "site_type": "biodiversity",
        "geojson": valid_polygon,
    }

    create_res = client.post("/api/v1/sites", json=site_payload, headers=headers)
    assert create_res.status_code == 201
    site_data = create_res.json()
    assert site_data["name"] == "Wayanad Primary Canopy Zone"
    assert site_data["site_type"] == "biodiversity"
    assert site_data["geojson"]["type"] == "Polygon"
    assert "area_hectares" in site_data
    assert site_data["area_hectares"] is not None
    assert site_data["area_hectares"] > 0


def test_malformed_polygon_rejection_cases(client):
    """Test strict backend rejection of malformed or self-intersecting GeoJSON polygons."""
    headers = _get_auth_headers(client, "checker@darukaa.earth", "analyst")
    p_res = client.post(
        "/api/v1/projects",
        json={"name": "Validation Test Project"},
        headers=headers,
    )
    proj_id = p_res.json()["id"]

    # Case A: Self-intersecting "bowtie" polygon (invalid boundary)
    bowtie_polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [0.0, 0.0],
                [0.0, 2.0],
                [2.0, 0.0],
                [2.0, 2.0],
                [0.0, 0.0],
            ]
        ],
    }
    res_a = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Bowtie Site",
            "geojson": bowtie_polygon,
        },
        headers=headers,
    )
    assert res_a.status_code == 422  # Pydantic validation error
    assert "self-intersects" in str(res_a.json()).lower()

    # Case B: Fewer than 3 unique points (insufficient points)
    insufficient_points = {
        "type": "Polygon",
        "coordinates": [
            [
                [0.0, 0.0],
                [1.0, 1.0],
                [0.0, 0.0],
            ]
        ],
    }
    res_b = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Two Point Site",
            "geojson": insufficient_points,
        },
        headers=headers,
    )
    assert res_b.status_code == 422

    # Case C: Invalid GeoJSON type (e.g. LineString instead of Polygon)
    linestring_geom = {
        "type": "LineString",
        "coordinates": [[0.0, 0.0], [1.0, 1.0], [2.0, 2.0]],
    }
    res_c = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "LineString Site",
            "geojson": linestring_geom,
        },
        headers=headers,
    )
    assert res_c.status_code == 422
    assert "must be 'polygon'" in str(res_c.json()).lower()

    # Case D: Unclosed polygon ring (start point != end point)
    unclosed_ring = {
        "type": "Polygon",
        "coordinates": [
            [
                [0.0, 0.0],
                [1.0, 0.0],
                [1.0, 1.0],
                [0.0, 1.0],
            ]
        ],
    }
    res_d = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Unclosed Ring Site",
            "geojson": unclosed_ring,
        },
        headers=headers,
    )
    assert res_d.status_code == 422
    assert "start point must equal end point" in str(res_d.json()).lower()


def test_site_listing_and_filtering(client):
    """Test site listing and filtering by project_id and site_type."""
    headers = _get_auth_headers(client, "filter_tester@darukaa.earth", "admin")

    p_res = client.post(
        "/api/v1/projects", json={"name": "Filter Project"}, headers=headers
    )
    proj_id = p_res.json()["id"]

    poly = {
        "type": "Polygon",
        "coordinates": [
            [[10.0, 10.0], [10.1, 10.0], [10.1, 10.1], [10.0, 10.1], [10.0, 10.0]]
        ],
    }

    client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Carbon Site Alpha",
            "site_type": "carbon",
            "geojson": poly,
        },
        headers=headers,
    )

    client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Bio Site Beta",
            "site_type": "biodiversity",
            "geojson": poly,
        },
        headers=headers,
    )

    # Filter by project_id
    res_all = client.get(f"/api/v1/sites?project_id={proj_id}", headers=headers)
    assert res_all.status_code == 200
    assert len(res_all.json()) == 2

    # Filter by site_type
    res_carbon = client.get(
        f"/api/v1/sites?project_id={proj_id}&site_type=carbon", headers=headers
    )
    assert res_carbon.status_code == 200
    assert len(res_carbon.json()) == 1
    assert res_carbon.json()[0]["site_type"] == "carbon"
