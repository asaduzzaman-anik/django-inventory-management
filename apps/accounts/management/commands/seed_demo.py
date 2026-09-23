"""
Local-only sample catalog and opening stock.

Safe to re-run. Does not create users or touch production data marked with other codes.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.catalog.models import Category, Product
from apps.inventory.services import receive_stock
from apps.suppliers.models import Supplier
from apps.warehouses.models import Warehouse

User = get_user_model()


class Command(BaseCommand):
    help = "Seed a small local demo catalog and opening stock. Idempotent."

    def handle(self, *args, **options):
        call_command("seed_roles")

        category, _ = Category.objects.get_or_create(
            slug="demo-hardware",
            defaults={"name": "Demo Hardware", "is_active": True},
        )
        supplier, _ = Supplier.objects.get_or_create(
            code="DEMO-SUP",
            defaults={
                "name": "Demo Supply Co",
                "city": "Dhaka",
                "country": "Bangladesh",
                "is_active": True,
            },
        )
        main, _ = Warehouse.objects.get_or_create(
            code="DEMO-MAIN",
            defaults={
                "name": "Demo Main Warehouse",
                "city": "Dhaka",
                "country": "Bangladesh",
                "is_active": True,
            },
        )
        store, _ = Warehouse.objects.get_or_create(
            code="DEMO-STORE",
            defaults={
                "name": "Demo Store",
                "city": "Dhaka",
                "country": "Bangladesh",
                "is_active": True,
            },
        )
        bolt, _ = Product.objects.get_or_create(
            sku="DEMO-BOLT",
            defaults={
                "name": "Demo Bolt",
                "category": category,
                "preferred_supplier": supplier,
                "cost_price": Decimal("5.00"),
                "selling_price": Decimal("8.50"),
                "reorder_level": Decimal("10.000"),
                "unit": Product.Unit.PCS,
                "is_active": True,
            },
        )
        box, _ = Product.objects.get_or_create(
            sku="DEMO-BOX",
            defaults={
                "name": "Demo Box",
                "category": category,
                "preferred_supplier": supplier,
                "cost_price": Decimal("12.00"),
                "selling_price": Decimal("18.00"),
                "reorder_level": Decimal("5.000"),
                "unit": Product.Unit.BOX,
                "is_active": True,
            },
        )

        poster = User.objects.filter(is_superuser=True).order_by("pk").first()
        if poster is None:
            poster = User.objects.filter(is_active=True).order_by("pk").first()
        if poster is None:
            self.stdout.write(self.style.WARNING("No user found. Create a superuser, then re-run seed_demo to post opening stock."))
            self.stdout.write(self.style.SUCCESS("Demo catalog ready."))
            return

        self._opening_stock(
            warehouse=main,
            product=bolt,
            quantity=Decimal("50.000"),
            unit_cost=Decimal("5.00"),
            user=poster,
            key="demo-opening-main-bolt",
        )
        self._opening_stock(
            warehouse=store,
            product=box,
            quantity=Decimal("20.000"),
            unit_cost=Decimal("12.00"),
            user=poster,
            key="demo-opening-store-box",
        )

        self.stdout.write(self.style.SUCCESS("Demo catalog and opening stock ready."))

    def _opening_stock(self, *, warehouse, product, quantity, unit_cost, user, key):
        receive_stock(
            warehouse=warehouse,
            items=[{"product": product, "quantity": quantity, "unit_cost": unit_cost}],
            user=user,
            note="Demo opening stock",
            idempotency_key=key,
        )
