def test_user_registration(client):
    """Test registering a new user account."""
    payload = {
        "email": "analyst@darukaa.earth",
        "password": "SecurePassword123!",
        "full_name": "Elena Rostova",
        "role": "analyst",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "analyst@darukaa.earth"
    assert data["full_name"] == "Elena Rostova"
    assert data["role"] == "analyst"
    assert "id" in data


def test_duplicate_registration_rejection(client):
    """Test registering with an existing email returns 400 Bad Request."""
    payload = {
        "email": "duplicate@darukaa.earth",
        "password": "Password123!",
        "full_name": "First User",
        "role": "viewer",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()


def test_user_login_success_and_failure(client):
    """Test user login authentication flow."""
    # Register user first
    reg_payload = {
        "email": "admin@darukaa.earth",
        "password": "AdminSecretPassword123!",
        "full_name": "System Admin",
        "role": "admin",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # Valid login
    login_payload = {
        "email": "admin@darukaa.earth",
        "password": "AdminSecretPassword123!",
    }
    res = client.post("/api/v1/auth/login", json=login_payload)
    assert res.status_code == 200
    tokens = res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"
    assert tokens["user"]["email"] == "admin@darukaa.earth"

    # Invalid password login
    bad_login = {
        "email": "admin@darukaa.earth",
        "password": "WrongPassword!",
    }
    bad_res = client.post("/api/v1/auth/login", json=bad_login)
    assert bad_res.status_code == 401


def test_get_current_user_me(client):
    """Test getting current user info via bearer token."""
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "me@darukaa.earth",
            "password": "MySecretPassword1!",
            "full_name": "Me User",
            "role": "viewer",
        },
    )
    assert reg.status_code == 201

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "me@darukaa.earth", "password": "MySecretPassword1!"},
    )
    token = login_res.json()["access_token"]

    # Request without token -> 401
    unauth = client.get("/api/v1/auth/me")
    assert unauth.status_code == 401

    # Request with bearer token -> 200
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "me@darukaa.earth"


def test_refresh_token_flow(client):
    """Test exchanging refresh token for a new access token."""
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "refresh@darukaa.earth",
            "password": "RefreshPassword123!",
            "full_name": "Refresh User",
            "role": "analyst",
        },
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": "refresh@darukaa.earth",
            "password": "RefreshPassword123!",
        },
    )
    refresh_token = login_res.json()["refresh_token"]

    refresh_res = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data
