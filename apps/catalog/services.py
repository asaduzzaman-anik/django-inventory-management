from django.utils.text import slugify
from PIL import Image
from rest_framework import serializers

from apps.catalog.models import Category

MAX_IMAGE_BYTES = 2 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_category_parent(category, parent):
    if parent is None:
        return
    if category is not None and category.pk == parent.pk:
        raise serializers.ValidationError({"parent": "A category cannot be its own parent."})
    if parent.parent_id is not None:
        raise serializers.ValidationError({"parent": "Categories can only be nested one level deep."})
    if category is not None and category.pk and category.children.exists():
        raise serializers.ValidationError(
            {"parent": "A category with subcategories cannot have a parent."}
        )


def validate_sibling_name(name, parent, category=None):
    queryset = Category.objects.filter(parent=parent, name=name)
    if category is not None and category.pk:
        queryset = queryset.exclude(pk=category.pk)
    if queryset.exists():
        raise serializers.ValidationError(
            {"name": "A category with this name already exists at this level."}
        )


def allocate_slug(name):
    base = slugify(name) or "category"
    slug = base
    counter = 2
    while Category.objects.filter(slug=slug).exists():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def validate_product_image(image):
    if image.size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError("Image must be 2 MB or smaller.")
    try:
        opened = Image.open(image)
        image_format = opened.format
        opened.verify()
    except serializers.ValidationError:
        raise
    except Exception as exc:
        raise serializers.ValidationError("Upload a valid JPEG, PNG, or WEBP image.") from exc
    finally:
        image.seek(0)
    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise serializers.ValidationError("Upload a valid JPEG, PNG, or WEBP image.")
