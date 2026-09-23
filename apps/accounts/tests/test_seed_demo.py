from decimal import Decimal

import pytest
from django.core.management import call_command

from apps.catalog.models import Product
from apps.inventory.models import InventoryTransaction, StockLevel
from apps.warehouses.models import Warehouse


@pytest.mark.django_db
def test_seed_demo_is_idempotent(django_user_model):
    django_user_model.objects.create_superuser(
        username="demoadmin",
        email="demoadmin@example.com",
        password="Str0ng-pass-word",
    )
    call_command("seed_demo")
    call_command("seed_demo")

    assert Warehouse.objects.filter(code="DEMO-MAIN").count() == 1
    assert Product.objects.filter(sku="DEMO-BOLT").count() == 1
    bolt = Product.objects.get(sku="DEMO-BOLT")
    main = Warehouse.objects.get(code="DEMO-MAIN")
    stock = StockLevel.objects.get(product=bolt, warehouse=main)
    assert stock.on_hand == Decimal("50.000")
    assert InventoryTransaction.objects.filter(product=bolt, warehouse=main).count() == 1
