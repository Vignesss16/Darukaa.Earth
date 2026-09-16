def _get_user_auth_headers(client, email: str, role: str):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": f"Test {role.capitalize()}",
            "role": role,
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_viewer_role_rbac_enforcement_returns_403(client):
    """Test that a Viewer user attempting create/update/delete gets HTTP 403 Forbidden."""
    viewer_headers = _get_user_auth_headers(
        client, "viewer_rbac@darukaa.earth", "viewer"
    )
    admin_headers = _get_user_auth_headers(client, "admin_rbac@darukaa.earth", "admin")

    # 1. Viewer trying to create project -> 403 Forbidden
    res_create_proj = client.post(
        "/api/v1/projects",
        json={"name": "Forbidden Project"},
        headers=viewer_headers,
    )
    assert res_create_proj.status_code == 403
    assert "operation not permitted" in res_create_proj.json()["detail"].lower()

    # Admin creates project for downstream delete test
    admin_proj = client.post(
        "/api/v1/projects",
        json={"name": "Admin Allowed Project"},
        headers=admin_headers,
    ).json()
    proj_id = admin_proj["id"]

    # 2. Viewer trying to create site -> 403 Forbidden
    poly = {
        "type": "Polygon",
        "coordinates": [
            [[10.0, 10.0], [10.1, 10.0], [10.1, 10.1], [10.0, 10.1], [10.0, 10.0]]
        ],
    }
    res_create_site = client.post(
        "/api/v1/sites",
        json={
            "project_id": proj_id,
            "name": "Forbidden Site",
            "geojson": poly,
        },
        headers=viewer_headers,
    )
    assert res_create_site.status_code == 403

    # 3. Viewer trying to delete project -> 403 Forbidden
    res_del_proj = client.delete(f"/api/v1/projects/{proj_id}", headers=viewer_headers)
    assert res_del_proj.status_code == 403


def test_analyst_role_rbac_enforcement(client):
    """Test Analyst role permissions (can create projects/sites, cannot delete projects)."""
    analyst_headers = _get_user_auth_headers(
        client, "analyst_rbac@darukaa.earth", "analyst"
    )

    # Analyst can create project
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": "Analyst Project"},
        headers=analyst_headers,
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # Analyst cannot delete project -> 403 Forbidden
    del_res = client.delete(f"/api/v1/projects/{proj_id}", headers=analyst_headers)
    assert del_res.status_code == 403
