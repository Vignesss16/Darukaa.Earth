def _get_auth_headers(
    client, email: str = "admin_audit@darukaa.earth", role: str = "admin"
):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Priya Sharma",
            "role": role,
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_project_create_update_delete_audit_logging(client):
    headers = _get_auth_headers(client, "priya_audit@darukaa.earth", "admin")

    # 1. Create Project
    proj_resp = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": "Audit Log Test Forest Reserve",
            "description": "Initial reserve description",
            "status": "active",
        },
    )
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # Check activity endpoint for create log
    act_resp = client.get("/api/v1/activity", headers=headers)
    assert act_resp.status_code == 200
    activities = act_resp.json()
    assert len(activities) > 0

    create_event = next(
        (
            a
            for a in activities
            if a["entity_type"] == "project"
            and str(a["entity_id"]) == str(project_id)
            and a["action"] == "create"
        ),
        None,
    )
    assert create_event is not None
    assert "Priya Sharma" in create_event["user_name"]
    assert (
        "Audit Log Test Forest Reserve" in create_event["sentence"]
        or "initialized conservation project" in create_event["sentence"]
    )

    # 2. Update Project
    upd_resp = client.put(
        f"/api/v1/projects/{project_id}",
        headers=headers,
        json={"name": "Audit Log Test Forest Reserve (Updated)"},
    )
    assert upd_resp.status_code == 200

    act_resp2 = client.get("/api/v1/activity", headers=headers)
    activities2 = act_resp2.json()
    upd_event = next(
        (
            a
            for a in activities2
            if a["entity_type"] == "project"
            and str(a["entity_id"]) == str(project_id)
            and a["action"] == "update"
        ),
        None,
    )
    assert upd_event is not None
    assert "updated" in upd_event["sentence"]

    # 3. Delete Project
    del_resp = client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert del_resp.status_code == 204

    act_resp3 = client.get("/api/v1/activity", headers=headers)
    activities3 = act_resp3.json()
    del_event = next(
        (
            a
            for a in activities3
            if a["entity_type"] == "project"
            and str(a["entity_id"]) == str(project_id)
            and a["action"] == "delete"
        ),
        None,
    )
    assert del_event is not None
    assert "deleted" in del_event["sentence"] or "archived" in del_event["sentence"]


def test_site_create_update_delete_audit_logging(client):
    headers = _get_auth_headers(client, "priya_site_audit@darukaa.earth", "admin")

    # First create parent project
    proj_resp = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Mangrove Restoration"},
    )
    project_id = proj_resp.json()["id"]

    # 1. Create Site
    site_geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [76.0, 11.0],
                [76.1, 11.0],
                [76.1, 11.1],
                [76.0, 11.1],
                [76.0, 11.0],
            ]
        ],
    }

    site_resp = client.post(
        "/api/v1/sites",
        headers=headers,
        json={
            "project_id": project_id,
            "name": "Site 4",
            "site_type": "carbon",
            "geojson": site_geojson,
        },
    )
    assert site_resp.status_code == 201
    site_id = site_resp.json()["id"]

    act_resp = client.get("/api/v1/activity", headers=headers)
    activities = act_resp.json()
    site_create_event = next(
        (
            a
            for a in activities
            if a["entity_type"] == "site"
            and str(a["entity_id"]) == str(site_id)
            and a["action"] == "create"
        ),
        None,
    )
    assert site_create_event is not None
    # Verifies requirement: "Priya added Site 4 to Mangrove Restoration"
    assert (
        "Priya Sharma added Site 4 to Mangrove Restoration"
        in site_create_event["sentence"]
    )

    # 2. Update Site
    upd_site_resp = client.put(
        f"/api/v1/sites/{site_id}",
        headers=headers,
        json={"name": "Site 4 (Renamed)"},
    )
    assert upd_site_resp.status_code == 200

    act_resp2 = client.get("/api/v1/activity", headers=headers)
    activities2 = act_resp2.json()
    site_upd_event = next(
        (
            a
            for a in activities2
            if a["entity_type"] == "site"
            and str(a["entity_id"]) == str(site_id)
            and a["action"] == "update"
        ),
        None,
    )
    assert site_upd_event is not None
    assert "updated" in site_upd_event["sentence"]

    # 3. Delete Site
    del_site_resp = client.delete(f"/api/v1/sites/{site_id}", headers=headers)
    assert del_site_resp.status_code == 204

    act_resp3 = client.get("/api/v1/activity", headers=headers)
    activities3 = act_resp3.json()
    site_del_event = next(
        (
            a
            for a in activities3
            if a["entity_type"] == "site"
            and str(a["entity_id"]) == str(site_id)
            and a["action"] == "delete"
        ),
        None,
    )
    assert site_del_event is not None
    assert "deleted" in site_del_event["sentence"]
