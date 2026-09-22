import pytest
from django.test import Client

from apps.accounts.models import User


@pytest.mark.django_db
def test_create_user_stores_hashed_password():
    user = User.objects.create_user(
        username="ada",
        email="ada@example.com",
        password="not-the-hash",
    )
    assert user.password != "not-the-hash"
    assert user.check_password("not-the-hash")


@pytest.mark.django_db
def test_admin_login():
    User.objects.create_superuser(
        username="root",
        email="root@example.com",
        password="a-local-password",
    )
    client = Client()
    assert client.login(username="root", password="a-local-password") is True
    response = client.get("/admin/")
    assert response.status_code == 200
