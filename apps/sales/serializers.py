from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import Product
from apps.sales.models import SalesOrder, SalesOrderItem, SalesReturn, SalesReturnItem
from apps.warehouses.models import Warehouse


class SalesOrderItemSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    quantity_returned = serializers.SerializerMethodField()

    class Meta:
        model = SalesOrderItem
        fields = [
            "id",
            "product",
            "sku",
            "product_name",
            "quantity",
            "unit_price",
            "line_total",
            "quantity_returned",
        ]
        read_only_fields = fields

    def get_quantity_returned(self, obj):
        total = sum((item.quantity for item in obj.return_items.all()), Decimal("0"))
        return total


class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True, read_only=True)
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id",
            "number",
            "warehouse",
            "warehouse_code",
            "customer_name",
            "customer_email",
            "customer_phone",
            "status",
            "payment_status",
            "discount_amount",
            "tax_rate",
            "subtotal",
            "tax_amount",
            "total",
            "notes",
            "created_by",
            "confirmed_at",
            "completed_at",
            "created_at",
            "updated_at",
            "items",
        ]
        read_only_fields = fields


class SalesOrderItemWriteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class SalesOrderCreateSerializer(serializers.Serializer):
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all())
    customer_name = serializers.CharField(max_length=255)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True, max_length=30)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = SalesOrderItemWriteSerializer(many=True)


class SalesOrderUpdateSerializer(serializers.Serializer):
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all(), required=False)
    customer_name = serializers.CharField(max_length=255, required=False)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True, max_length=30)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = SalesOrderItemWriteSerializer(many=True, required=False)


class PaymentStatusSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=SalesOrder.PaymentStatus.choices)


class ReturnItemWriteSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)


class ReturnWriteSerializer(serializers.Serializer):
    items = ReturnItemWriteSerializer(many=True)
    note = serializers.CharField(required=False, allow_blank=True)


class SalesReturnItemSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = SalesReturnItem
        fields = ["id", "sales_order_item", "product", "sku", "quantity", "transaction"]
        read_only_fields = fields


class SalesReturnSerializer(serializers.ModelSerializer):
    items = SalesReturnItemSerializer(many=True, read_only=True)
    sales_order_number = serializers.CharField(source="sales_order.number", read_only=True)

    class Meta:
        model = SalesReturn
        fields = [
            "id",
            "number",
            "sales_order",
            "sales_order_number",
            "note",
            "created_by",
            "created_at",
            "items",
        ]
        read_only_fields = fields
