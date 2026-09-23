from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.accounts.models import User, UserWarehouse
from apps.catalog.models import Category, Product
from apps.inventory.models import StockLevel
from apps.warehouses.models import Warehouse

PASSWORD = "Str0ng-pass-word"


@pytest.fixture
def api():
    return APIClient()


def _user(username, role, warehouse):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", password=PASSWORD)
    user.groups.add(Group.objects.get(name=role))
    UserWarehouse.objects.create(user=user, warehouse=warehouse)
    return user


@pytest.mark.django_db
def test_role_matrix_smoke(api):
    call_command("seed_roles")
    warehouse = Warehouse.objects.create(name="Main", code="MAIN")
    checks = {
        "Super Admin": [("get", "/api/v1/users/", 200), ("get", "/api/v1/audit-logs/", 200)],
        "Warehouse Manager": [("get", "/api/v1/stock/", 200), ("get", "/api/v1/users/", 403)],
        "Inventory Staff": [("get", "/api/v1/stock/", 200), ("get", "/api/v1/sales-orders/", 403)],
        "Sales Staff": [("get", "/api/v1/sales-orders/", 200), ("post", "/api/v1/stock-receipts/", 403)],
        "Viewer": [("get", "/api/v1/stock/", 200), ("post", "/api/v1/stock-receipts/", 403)],
    }
    for role, calls in checks.items():
        user = _user(role.lower().replace(" ", "-"), role, warehouse)
        api.force_authenticate(user=user)
        for method, path, expected in calls:
            response = getattr(api, method)(path, format="json")
            assert response.status_code == expected, f"{role} {method} {path} returned {response.status_code}"


@pytest.mark.django_db
def test_stock_and_dashboard_do_not_query_each_product(api):
    call_command("seed_roles")
    category = Category.objects.create(name="Hardware", slug="hardware")
    warehouse = Warehouse.objects.create(name="Main", code="MAIN")
    for index in range(3):
        product = Product.objects.create(
            sku=f"SKU-{index}",
            name=f"Item {index}",
            category=category,
            cost_price=Decimal("1.00"),
            selling_price=Decimal("2.00"),
        )
        StockLevel.objects.create(product=product, warehouse=warehouse, on_hand=Decimal("1.000"))
    user = _user("reader", "Super Admin", warehouse)
    api.force_authenticate(user=user)

    with CaptureQueriesContext(connection) as stock_queries:
        stock = api.get("/api/v1/stock/")
    assert stock.status_code == 200
    assert len(stock.data["results"]) == 3
    assert _bare_product_lookups(stock_queries) == 0

    with CaptureQueriesContext(connection) as dashboard_queries:
        dashboard = api.get("/api/v1/dashboard/")
    assert dashboard.status_code == 200
    assert _bare_product_lookups(dashboard_queries) == 0


def _bare_product_lookups(captured):
    count = 0
    for query in captured.captured_queries:
        sql = query["sql"].lower()
        if "catalog_product" not in sql or "join" in sql or "count(" in sql:
            continue
        count += 1
    return count
