from rest_framework import serializers

from apps.catalog.models import Product
from apps.purchasing.models import PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReceiptItem
from apps.suppliers.models import Supplier
from apps.warehouses.models import Warehouse


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id",
            "product",
            "sku",
            "product_name",
            "quantity_ordered",
            "quantity_received",
            "unit_cost",
            "line_total",
        ]
        read_only_fields = fields


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "number",
            "supplier",
            "supplier_name",
            "warehouse",
            "warehouse_code",
            "status",
            "notes",
            "total",
            "created_by",
            "submitted_at",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
            "items",
        ]
        read_only_fields = fields


class PurchaseOrderItemWriteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity_ordered = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2)


class PurchaseOrderCreateSerializer(serializers.Serializer):
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all())
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True)
    items = PurchaseOrderItemWriteSerializer(many=True)


class PurchaseOrderUpdateSerializer(serializers.Serializer):
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all(), required=False)
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all(), required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = PurchaseOrderItemWriteSerializer(many=True, required=False)


class ReceiveItemWriteSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)


class ReceiveWriteSerializer(serializers.Serializer):
    items = ReceiveItemWriteSerializer(many=True)
    note = serializers.CharField(required=False, allow_blank=True)


class PurchaseReceiptItemSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = PurchaseReceiptItem
        fields = ["id", "purchase_order_item", "product", "sku", "quantity", "transaction"]
        read_only_fields = fields


class PurchaseReceiptSerializer(serializers.ModelSerializer):
    items = PurchaseReceiptItemSerializer(many=True, read_only=True)
    purchase_order_number = serializers.CharField(source="purchase_order.number", read_only=True)

    class Meta:
        model = PurchaseReceipt
        fields = [
            "id",
            "number",
            "purchase_order",
            "purchase_order_number",
            "received_by",
            "received_at",
            "note",
            "items",
        ]
        read_only_fields = fields
