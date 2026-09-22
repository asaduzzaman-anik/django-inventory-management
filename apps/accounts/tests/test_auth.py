import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User

PASSWORD = "Str0ng-pass-word"
NEW_PASSWORD = "Another-str0ng-pass"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="ada",
        email="ada@example.com",
        password=PASSWORD,
        first_name="Ada",
        last_name="Lovelace",
    )


@pytest.fixture
def client():
    return APIClient()


def login(client, username="ada", password=PASSWORD):
    return client.post(
        "/api/v1/auth/login/",
        {"username": username, "password": password},
        format="json",
    )


@pytest.mark.django_db
def test_login_returns_tokens_and_user_without_password(client, user):
    response = login(client)
    assert response.status_code == 200
    body = response.json()
    assert body["access"]
    assert body["refresh"]
    assert body["user"]["username"] == user.username
    assert body["user"]["email"] == user.email
    assert "password" not in body["user"]


@pytest.mark.django_db
def test_login_rejects_bad_password(client, user):
    response = login(client, password="wrong-password")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


@pytest.mark.django_db
def test_refresh_rotates_and_blacklists_the_previous_token(client, user):
    first = login(client).json()
    refreshed = client.post(
        "/api/v1/auth/refresh/",
        {"refresh": first["refresh"]},
        format="json",
    )
    assert refreshed.status_code == 200
    second = refreshed.json()
    assert second["access"]
    assert second["refresh"]
    assert second["refresh"] != first["refresh"]

    reused = client.post(
        "/api/v1/auth/refresh/",
        {"refresh": first["refresh"]},
        format="json",
    )
    assert reused.status_code == 401
    assert reused.json()["code"] == "not_authenticated"


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(client, user):
    tokens = login(client).json()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    logout = client.post(
        "/api/v1/auth/logout/",
        {"refresh": tokens["refresh"]},
        format="json",
    )
    assert logout.status_code == 204

    client.credentials()
    reused = client.post(
        "/api/v1/auth/refresh/",
        {"refresh": tokens["refresh"]},
        format="json",
    )
    assert reused.status_code == 401


@pytest.mark.django_db
def test_me_requires_authentication(client):
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


@pytest.mark.django_db
def test_me_returns_and_updates_profile(client, user):
    tokens = login(client).json()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    profile = client.get("/api/v1/auth/me/")
    assert profile.status_code == 200
    body = profile.json()
    assert "password" not in body
    assert body["role"] is None
    assert body["permissions"] == []
    assert body["is_superuser"] is False

    updated = client.patch(
        "/api/v1/auth/me/",
        {"phone": "555-0100", "first_name": "Augusta"},
        format="json",
    )
    assert updated.status_code == 200
    assert updated.json()["phone"] == "555-0100"
    assert updated.json()["first_name"] == "Augusta"
    user.refresh_from_db()
    assert user.phone == "555-0100"


@pytest.mark.django_db
def test_change_password_rejects_wrong_current_password(client, user):
    tokens = login(client).json()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    response = client.post(
        "/api/v1/auth/change-password/",
        {"current_password": "wrong-password", "new_password": NEW_PASSWORD},
        format="json",
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"
    assert "current_password" in response.json()["errors"]


@pytest.mark.django_db
def test_change_password_replaces_the_password(client, user):
    tokens = login(client).json()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    changed = client.post(
        "/api/v1/auth/change-password/",
        {"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        format="json",
    )
    assert changed.status_code == 204

    client.credentials()
    assert login(client).status_code == 401
    assert login(client, password=NEW_PASSWORD).status_code == 200


@pytest.mark.django_db
def test_login_is_throttled(client, user):
    statuses = [
        login(client, password="wrong-password").status_code
        for _ in range(11)
    ]
    assert statuses[-1] == 429
    assert statuses.count(401) == 10


def test_schema_and_docs_are_public(client):
    schema = client.get("/api/schema/")
    docs = client.get("/api/docs/")
    assert schema.status_code == 200
    assert docs.status_code == 200
