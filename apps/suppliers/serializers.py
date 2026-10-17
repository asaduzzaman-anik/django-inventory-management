from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.inventory.models import DocumentSequence
from apps.suppliers.models import Supplier

CODE_PREFIX = "SUP"


class SupplierSerializer(serializers.ModelSerializer):
    code = serializers.CharField(max_length=32, required=False, allow_blank=True)

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
        code = value.strip().upper()
        if not code and self.instance is not None:
            raise serializers.ValidationError("Code is required.")
        if code and Supplier.objects.exclude(pk=getattr(self.instance, "pk", None)).filter(code=code).exists():
            raise serializers.ValidationError("A supplier with this code already exists.")
        return code

    def create(self, validated_data):
        with transaction.atomic():
            if not validated_data.get("code"):
                validated_data["code"] = _next_code()
            return super().create(validated_data)


def _next_code():
    try:
        with transaction.atomic():
            DocumentSequence.objects.create(prefix=CODE_PREFIX, last_value=0)
    except IntegrityError:
        pass
    sequence = DocumentSequence.objects.select_for_update().get(prefix=CODE_PREFIX)
    while True:
        sequence.last_value += 1
        code = f"{CODE_PREFIX}-{sequence.last_value:03d}"
        if not Supplier.objects.filter(code=code).exists():
            break
    sequence.save(update_fields=["last_value"])
    return code
