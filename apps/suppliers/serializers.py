from rest_framework import serializers

from apps.suppliers.models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "code",
            "email",
            "phone",
            "contact_name",
            "address_line",
            "city",
            "country",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_code(self, value):
        return value.strip().upper()
