"""Authentication and User Profile security test suite."""
import httpx
import pytest

from app.core.security import hash_password, verify_password


@pytest.mark.asyncio
async def test_argon2_password_hashing():
    """Verify passwords are protected using OWASP-compliant Argon2id hashing."""
    plain = "SuperSecretPassword!2026"
    hashed = hash_password(plain)

    assert hashed != plain
    assert "$argon2id$" in hashed
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword!2026", hashed) is False


@pytest.mark.asyncio
async def test_register_and_login_flow(client: httpx.AsyncClient):
    """Test full registration and login lifecycle with HTTP-only cookie and JWT."""
    email = "newuser@traceguard.test"
    password = "SecuredPassword!2026"
    full_name = "Jane Privacy"

    # 1. Register
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == email
    assert data["user"]["full_name"] == full_name
    assert "access_token" in reg_resp.cookies

    # 2. Duplicate registration rejected
    dup_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert dup_resp.status_code == 400
    assert "already registered" in dup_resp.json()["detail"].lower()

    # 3. Login with correct credentials
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == email

    # 4. Login with invalid password
    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword123!"},
    )
    assert bad_login.status_code == 401

    # 5. Access /auth/me with Bearer token
    token = login_data["access_token"]
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

    # 6. Access /auth/me with HTTP-only cookie
    cookie_client = httpx.AsyncClient(
        transport=client._transport,
        base_url="http://test",
        cookies={"access_token": token},
    )
    me_cookie_resp = await cookie_client.get("/api/v1/auth/me")
    assert me_cookie_resp.status_code == 200
    assert me_cookie_resp.json()["email"] == email

    # 7. Access /auth/me without auth returns 401
    anon_client = httpx.AsyncClient(
        transport=client._transport,
        base_url="http://test",
    )
    anon_resp = await anon_client.get("/api/v1/auth/me")
    assert anon_resp.status_code == 401

    # 8. Logout
    logout_resp = await client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200


@pytest.mark.asyncio
async def test_update_user_profile(client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]):
    """Test user profile inspection and update via PATCH /api/v1/users/me."""
    get_res = await client.get("/api/v1/users/me", headers=auth_headers_user_a)
    assert get_res.status_code == 200
    original_user = get_res.json()

    patch_res = await client.patch(
        "/api/v1/users/me",
        headers=auth_headers_user_a,
        json={"full_name": "Updated User Alpha Name"},
    )
    assert patch_res.status_code == 200
    updated_user = patch_res.json()
    assert updated_user["id"] == original_user["id"]
    assert updated_user["full_name"] == "Updated User Alpha Name"
