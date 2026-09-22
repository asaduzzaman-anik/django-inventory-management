from django.utils.text import slugify
from rest_framework import serializers

from apps.catalog.models import Category, Product
from apps.catalog.services import (
    allocate_slug,
    validate_category_parent,
    validate_product_image,
    validate_sibling_name,
)


class CategorySerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    parent_name = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "parent",
            "parent_name",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "parent_name", "created_at", "updated_at"]

    def get_parent_name(self, obj):
        if obj.parent_id is None:
            return None
        return obj.parent.name

    def validate_slug(self, value):
        if not value:
            return ""
        slug = slugify(value)
        if not slug:
            raise serializers.ValidationError("Enter a valid slug.")
        queryset = Category.objects.filter(slug=slug)
        if self.instance is not None and self.instance.pk:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("This slug is already in use.")
        return slug

    def validate(self, attrs):
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        name = attrs.get("name", getattr(self.instance, "name", ""))
        validate_category_parent(self.instance, parent)
        validate_sibling_name(name, parent, self.instance)
        return attrs

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = allocate_slug(validated_data["name"])
        return super().create(validated_data)


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    barcode = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "barcode",
            "name",
            "description",
            "category",
            "category_name",
            "cost_price",
            "selling_price",
            "reorder_level",
            "unit",
            "is_active",
            "image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "category_name", "created_at", "updated_at"]

    def validate_sku(self, value):
        return value.strip().upper()

    def validate_barcode(self, value):
        if not value:
            return None
        return value.strip() or None

    def validate_category(self, category):
        current_id = getattr(self.instance, "category_id", None)
        if not category.is_active and category.pk != current_id:
            raise serializers.ValidationError("Choose an active category.")
        return category

    def validate_image(self, image):
        if image in (None, ""):
            return image
        validate_product_image(image)
        return image
