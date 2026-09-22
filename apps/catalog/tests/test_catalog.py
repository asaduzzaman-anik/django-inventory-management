import io

import pytest
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.catalog.models import Category, Product

PASSWORD = "Str0ng-pass-word"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    return APIClient()


def login_as(api, role, username):
    call_command("seed_roles")
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


def image_bytes(fmt):
    buffer = io.BytesIO()
    Image.new("RGB", (1, 1), "red").save(buffer, format=fmt)
    return buffer.getvalue()


@pytest.mark.django_db
def test_viewer_can_read_but_not_create_categories(api):
    login_as(api, "Viewer", "viewer")
    response = api.post("/api/v1/categories/", {"name": "Hardware"}, format="json")
    assert response.status_code == 403
    assert response.json()["code"] == "permission_denied"
    assert api.get("/api/v1/categories/").status_code == 200


@pytest.mark.django_db
def test_category_depth_cycles_and_sibling_names(api):
    login_as(api, "Warehouse Manager", "manager")

    root = api.post("/api/v1/categories/", {"name": "Hardware"}, format="json")
    assert root.status_code == 201
    root_id = root.json()["id"]
    assert root.json()["slug"] == "hardware"

    duplicate_root = api.post("/api/v1/categories/", {"name": "Hardware"}, format="json")
    assert duplicate_root.status_code == 400

    child = api.post(
        "/api/v1/categories/",
        {"name": "Screws", "parent": root_id},
        format="json",
    )
    assert child.status_code == 201
    child_id = child.json()["id"]

    other_parent = api.post("/api/v1/categories/", {"name": "Electrical"}, format="json")
    same_child_name = api.post(
        "/api/v1/categories/",
        {"name": "Screws", "parent": other_parent.json()["id"]},
        format="json",
    )
    assert same_child_name.status_code == 201

    grandchild = api.post(
        "/api/v1/categories/",
        {"name": "Wood screws", "parent": child_id},
        format="json",
    )
    assert grandchild.status_code == 400
    assert "parent" in grandchild.json()["errors"]

    cycle = api.patch(f"/api/v1/categories/{root_id}/", {"parent": root_id}, format="json")
    assert cycle.status_code == 400

    nested_parent = api.patch(
        f"/api/v1/categories/{root_id}/",
        {"parent": child_id},
        format="json",
    )
    assert nested_parent.status_code == 400

    deactivated = api.patch(f"/api/v1/categories/{child_id}/", {"is_active": False}, format="json")
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert AuditLog.objects.filter(
        action=AuditLog.Action.CREATE,
        entity_type="catalog.Category",
        entity_id=str(root_id),
    ).exists()

    admin = User.objects.create_superuser(
        username="catalog-admin",
        email="catalog-admin@example.com",
        password=PASSWORD,
    )
    admin_login = api.post(
        "/api/v1/auth/login/",
        {"username": admin.username, "password": PASSWORD},
        format="json",
    )
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_login.json()['access']}")
    assert api.delete(f"/api/v1/categories/{root_id}/").status_code == 405


@pytest.mark.django_db
def test_product_sku_is_unique_and_uppercased(api):
    login_as(api, "Warehouse Manager", "manager")
    category_id = api.post("/api/v1/categories/", {"name": "Hardware"}, format="json").json()["id"]
    payload = {
        "sku": "ab-1",
        "name": "Bolt",
        "category": category_id,
        "cost_price": "1.50",
        "selling_price": "2.00",
    }
    created = api.post("/api/v1/products/", payload, format="json")
    assert created.status_code == 201
    assert created.json()["sku"] == "AB-1"
    assert created.json()["barcode"] is None

    duplicate = api.post("/api/v1/products/", {**payload, "name": "Bolt 2"}, format="json")
    assert duplicate.status_code == 400

    second = api.post(
        "/api/v1/products/",
        {**payload, "sku": "ab-2", "name": "Nut", "barcode": ""},
        format="json",
    )
    assert second.status_code == 201
    assert Product.objects.filter(barcode__isnull=True).count() == 2

    negative = api.post(
        "/api/v1/products/",
        {**payload, "sku": "ab-3", "name": "Washer", "cost_price": "-1"},
        format="json",
    )
    assert negative.status_code == 400


@pytest.mark.django_db
def test_product_image_rules(api):
    login_as(api, "Warehouse Manager", "manager")
    category_id = api.post("/api/v1/categories/", {"name": "Hardware"}, format="json").json()["id"]
    fields = {
        "sku": "IMG-1",
        "name": "Painted bolt",
        "category": category_id,
        "cost_price": "1.00",
        "selling_price": "3.00",
    }

    uploaded = api.post(
        "/api/v1/products/",
        {**fields, "image": SimpleUploadedFile("bolt.png", image_bytes("PNG"), "image/png")},
        format="multipart",
    )
    assert uploaded.status_code == 201
    assert "products/" in uploaded.json()["image"]

    oversized = SimpleUploadedFile(
        "big.png",
        image_bytes("PNG") + (b"\x00" * (2 * 1024 * 1024)),
        "image/png",
    )
    too_big = api.post(
        "/api/v1/products/",
        {**fields, "sku": "IMG-2", "image": oversized},
        format="multipart",
    )
    assert too_big.status_code == 400
    assert "2 MB" in str(too_big.json()["errors"])

    gif = api.post(
        "/api/v1/products/",
        {
            **fields,
            "sku": "IMG-3",
            "image": SimpleUploadedFile("bolt.gif", image_bytes("GIF"), "image/gif"),
        },
        format="multipart",
    )
    assert gif.status_code == 400

    inactive = Category.objects.get(pk=category_id)
    inactive.is_active = False
    inactive.save(update_fields=["is_active"])
    rejected = api.post(
        "/api/v1/products/",
        {**fields, "sku": "IMG-4", "category": category_id},
        format="json",
    )
    assert rejected.status_code == 400
