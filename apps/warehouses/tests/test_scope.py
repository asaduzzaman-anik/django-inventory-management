import pytest
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.common.scoping import visible_warehouses

PASSWORD = "Str0ng-pass-word"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    return APIClient()


def login_as(api, role, username, *, superuser=False):
    call_command("seed_roles")
    if superuser:
        user = User.objects.create_superuser(
            username=username,
            email=f"{username}@example.com",
            password=PASSWORD,
        )
    else:
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password=PASSWORD,
        )
        user.groups.add(Group.objects.get(name=role))
    response = api.post(
        "/api/v1/auth/login/",
        {"username": username, "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.json()['access']}")
    return user


@pytest.mark.django_db
def test_supplier_code_is_unique_and_managers_can_write(api):
    login_as(api, "Warehouse Manager", "manager")
    created = api.post(
        "/api/v1/suppliers/",
        {"name": "Acme Supply", "code": "acme", "email": "acme@example.com"},
        format="json",
    )
    assert created.status_code == 201
    assert created.json()["code"] == "ACME"

    duplicate = api.post(
        "/api/v1/suppliers/",
        {"name": "Other", "code": "ACME"},
        format="json",
    )
    assert duplicate.status_code == 400

    warehouse_attempt = api.post(
        "/api/v1/warehouses/",
        {"name": "Main", "code": "MAIN"},
        format="json",
    )
    assert warehouse_attempt.status_code == 403
    assert AuditLog.objects.filter(action=AuditLog.Action.CREATE, entity_type="suppliers.Supplier").exists()


@pytest.mark.django_db
def test_warehouse_assignments_control_visibility(api):
    admin = login_as(api, "Super Admin", "admin")
    first = api.post("/api/v1/warehouses/", {"name": "Main", "code": "main"}, format="json")
    second = api.post("/api/v1/warehouses/", {"name": "Overflow", "code": "over"}, format="json")
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["code"] == "MAIN"
    assert api.post("/api/v1/warehouses/", {"name": "Again", "code": "MAIN"}, format="json").status_code == 400

    viewer = User.objects.create_user(
        username="viewer",
        email="viewer@example.com",
        password=PASSWORD,
    )
    viewer.groups.add(Group.objects.get(name="Viewer"))
    assert visible_warehouses(viewer).count() == 0

    viewer_client = APIClient()
    logged_in = viewer_client.post(
        "/api/v1/auth/login/",
        {"username": "viewer", "password": PASSWORD},
        format="json",
    )
    viewer_client.credentials(HTTP_AUTHORIZATION=f"Bearer {logged_in.json()['access']}")
    assert viewer_client.get("/api/v1/warehouses/").json()["count"] == 0
    assert viewer_client.get(f"/api/v1/warehouses/{second.json()['id']}/").status_code == 404

    replaced = api.put(
        f"/api/v1/users/{viewer.id}/warehouses/",
        {"warehouses": [first.json()["id"], second.json()["id"]]},
        format="json",
    )
    assert replaced.status_code == 200
    assert [row["code"] for row in replaced.json()["warehouses"]] == ["MAIN", "OVER"]

    narrowed = api.put(
        f"/api/v1/users/{viewer.id}/warehouses/",
        {"warehouses": [first.json()["id"]]},
        format="json",
    )
    assert [row["id"] for row in narrowed.json()["warehouses"]] == [first.json()["id"]]
    assert visible_warehouses(viewer).count() == 1
    assert viewer_client.get("/api/v1/warehouses/").json()["count"] == 1
    assert viewer_client.get(f"/api/v1/warehouses/{second.json()['id']}/").status_code == 404
    assert viewer_client.get(f"/api/v1/warehouses/{first.json()['id']}/").status_code == 200
    assert visible_warehouses(admin).count() == 2

    assignment_log = AuditLog.objects.filter(entity_id=str(viewer.id), action=AuditLog.Action.UPDATE).latest("created_at")
    assert assignment_log.metadata["current"] == [first.json()["id"]]


@pytest.mark.django_db
def test_product_can_store_a_preferred_supplier(api):
    login_as(api, "Warehouse Manager", "manager")
    supplier = api.post("/api/v1/suppliers/", {"name": "Acme", "code": "acme"}, format="json").json()
    category = api.post("/api/v1/categories/", {"name": "Hardware"}, format="json").json()
    created = api.post(
        "/api/v1/products/",
        {
            "sku": "bolt-1",
            "name": "Bolt",
            "category": category["id"],
            "preferred_supplier": supplier["id"],
            "cost_price": "1.00",
            "selling_price": "2.00",
        },
        format="json",
    )
    assert created.status_code == 201
    assert created.json()["preferred_supplier"] == supplier["id"]
    assert created.json()["preferred_supplier_name"] == "Acme"

    api.patch(f"/api/v1/suppliers/{supplier['id']}/", {"is_active": False}, format="json")
    inactive = api.post("/api/v1/suppliers/", {"name": "Dormant", "code": "old", "is_active": False}, format="json")
    rejected = api.post(
        "/api/v1/products/",
        {
            "sku": "bolt-2",
            "name": "Nut",
            "category": category["id"],
            "preferred_supplier": inactive.json()["id"],
            "cost_price": "1.00",
            "selling_price": "2.00",
        },
        format="json",
    )
    assert rejected.status_code == 400
