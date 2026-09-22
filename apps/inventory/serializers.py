from rest_framework import serializers

from apps.catalog.models import Product
from apps.inventory.models import InventoryTransaction, StockLevel, StockReceipt, StockReceiptItem
from apps.warehouses.models import Warehouse


class StockLevelSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    category = serializers.IntegerField(source="product.category_id", read_only=True)
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    available = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)
    effective_reorder_level = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = StockLevel
        fields = [
            "id",
            "product",
            "sku",
            "product_name",
            "category",
            "warehouse",
            "warehouse_code",
            "warehouse_name",
            "on_hand",
            "reserved",
            "available",
            "reorder_level",
            "effective_reorder_level",
            "status",
        ]
        read_only_fields = fields


class InventoryTransactionSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            "id",
            "product",
            "sku",
            "product_name",
            "warehouse",
            "warehouse_code",
            "transaction_type",
            "quantity_change",
            "balance_after",
            "unit_cost",
            "reference_type",
            "reference_id",
            "reference_code",
            "note",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = fields


class StockReceiptItemSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = StockReceiptItem
        fields = ["id", "product", "sku", "product_name", "quantity", "unit_cost", "transaction"]
        read_only_fields = fields


class StockReceiptSerializer(serializers.ModelSerializer):
    items = StockReceiptItemSerializer(many=True, read_only=True)
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)

    class Meta:
        model = StockReceipt
        fields = [
            "id",
            "number",
            "warehouse",
            "warehouse_code",
            "note",
            "created_by",
            "created_at",
            "items",
        ]
        read_only_fields = fields


class ReceiptItemWriteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2)


class ReceiptWriteSerializer(serializers.Serializer):
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all())
    note = serializers.CharField(required=False, allow_blank=True)
    items = ReceiptItemWriteSerializer(many=True)
