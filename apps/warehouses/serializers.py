from rest_framework import serializers

from apps.warehouses.models import Warehouse


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = [
            "id",
            "name",
            "code",
            "address_line",
            "city",
            "country",
            "contact_name",
            "phone",
            "email",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_code(self, value):
        return value.strip().upper()
