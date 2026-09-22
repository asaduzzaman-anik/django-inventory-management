import json

import pytest
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.audit.models import AuditLog

PASSWORD = "Str0ng-pass-word"
ATTEMPTED_PASSWORD = "not-the-real-secret"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    return APIClient()


def authenticate(api, user, password=PASSWORD):
    response = api.post(
        "/api/v1/auth/login/",
        {"username": user.username, "password": password},
        format="json",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.json()['access']}")
    return response


@pytest.mark.django_db
def test_seed_roles_is_idempotent():
    superuser = User.objects.create_superuser(
        username="root",
        email="root@example.com",
        password=PASSWORD,
    )
    call_command("seed_roles")
    call_command("seed_roles")

    assert Group.objects.count() == 5
    super_admin = Group.objects.get(name="Super Admin")
    codenames = set(super_admin.permissions.values_list("codename", flat=True))
    assert codenames == {
        "manage_users",
        "view_auditlog",
        "view_category",
        "add_category",
        "change_category",
        "view_product",
        "add_product",
        "change_product",
        "view_supplier",
        "add_supplier",
        "change_supplier",
        "view_warehouse",
        "add_warehouse",
        "change_warehouse",
        "view_stocklevel",
        "view_stockreceipt",
        "view_inventorytransaction",
        "view_stocktransfer",
        "view_stockadjustment",
        "receive_stock",
        "transfer_stock",
        "adjust_stock",
        "view_purchaseorder",
        "add_purchaseorder",
        "change_purchaseorder",
        "submit_purchaseorder",
        "approve_purchaseorder",
        "receive_purchaseorder",
    }
    viewer_codes = set(
        Group.objects.get(name="Viewer").permissions.values_list("codename", flat=True)
    )
    assert viewer_codes == {
        "view_category",
        "view_product",
        "view_supplier",
        "view_warehouse",
        "view_stocklevel",
        "view_stockreceipt",
        "view_inventorytransaction",
        "view_stocktransfer",
        "view_stockadjustment",
        "view_purchaseorder",
    }
    assert superuser.groups.filter(name="Super Admin").exists()


@pytest.mark.django_db
def test_viewer_cannot_manage_users(api):
    call_command("seed_roles")
    viewer = User.objects.create_user(
        username="viewer",
        email="viewer@example.com",
        password=PASSWORD,
    )
    viewer.groups.add(Group.objects.get(name="Viewer"))
    authenticate(api, viewer)

    response = api.post(
        "/api/v1/users/",
        {
            "username": "other",
            "email": "other@example.com",
            "password": PASSWORD,
            "role": "Viewer",
        },
        format="json",
    )
    assert response.status_code == 403
    assert response.json()["code"] == "permission_denied"
    assert api.get("/api/v1/audit-logs/").status_code == 403


@pytest.mark.django_db
def test_super_admin_can_create_update_and_reassign_users(api):
    call_command("seed_roles")
    admin = User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password=PASSWORD,
    )
    admin.groups.add(Group.objects.get(name="Super Admin"))
    authenticate(api, admin)

    created = api.post(
        "/api/v1/users/",
        {
            "username": "mina",
            "email": "mina@example.com",
            "password": PASSWORD,
            "first_name": "Mina",
            "role": "Inventory Staff",
        },
        format="json",
    )
    assert created.status_code == 201
    body = created.json()
    assert body["role"] == "Inventory Staff"
    assert "password" not in body
    user_id = body["id"]

    listed = api.get("/api/v1/users/", {"search": "mina", "role": "Inventory Staff"})
    assert listed.status_code == 200
    assert listed.json()["results"][0]["username"] == "mina"

    deactivated = api.patch(f"/api/v1/users/{user_id}/", {"is_active": False}, format="json")
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False

    reassigned = api.put(f"/api/v1/users/{user_id}/role/", {"role": "Viewer"}, format="json")
    assert reassigned.status_code == 200
    assert reassigned.json()["role"] == "Viewer"
    assert User.objects.get(pk=user_id).groups.filter(name="Inventory Staff").exists() is False

    invalid = api.put(f"/api/v1/users/{user_id}/role/", {"role": "Owner"}, format="json")
    assert invalid.status_code == 400


@pytest.mark.django_db
def test_login_and_user_changes_are_audited_without_passwords(api):
    call_command("seed_roles")
    admin = User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password=PASSWORD,
    )
    admin.groups.add(Group.objects.get(name="Super Admin"))

    failed = api.post(
        "/api/v1/auth/login/",
        {"username": "admin", "password": ATTEMPTED_PASSWORD},
        format="json",
    )
    assert failed.status_code == 401
    failure = AuditLog.objects.get(action=AuditLog.Action.LOGIN, metadata__success=False)
    stored = json.dumps(failure.metadata)
    assert failure.user_id is None
    assert ATTEMPTED_PASSWORD not in stored
    assert "password" not in failure.metadata

    logged_in = authenticate(api, admin)
    success = AuditLog.objects.get(action=AuditLog.Action.LOGIN, metadata__success=True)
    assert success.user_id == admin.id
    assert PASSWORD not in json.dumps(success.metadata)

    api.post("/api/v1/auth/logout/", {"refresh": logged_in.json()["refresh"]}, format="json")
    assert AuditLog.objects.filter(action=AuditLog.Action.LOGOUT, user=admin).exists()

    created = api.post(
        "/api/v1/users/",
        {
            "username": "mina",
            "email": "mina@example.com",
            "password": PASSWORD,
            "role": "Viewer",
        },
        format="json",
    )
    create_log = AuditLog.objects.get(action=AuditLog.Action.CREATE, entity_id=str(created.json()["id"]))
    assert create_log.metadata["role"] == "Viewer"
    assert PASSWORD not in json.dumps(create_log.metadata)

    api.put(f"/api/v1/users/{created.json()['id']}/role/", {"role": "Sales Staff"}, format="json")
    role_log = AuditLog.objects.filter(action=AuditLog.Action.UPDATE).latest("created_at")
    assert role_log.metadata["current"]["name"] == "Sales Staff"

    logs = api.get("/api/v1/audit-logs/", {"action": "LOGIN"})
    assert logs.status_code == 200
    assert logs.json()["count"] == 2
    assert all(item["action"] == "LOGIN" for item in logs.json()["results"])
