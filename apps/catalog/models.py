from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models import TimeStampedModel


class Category(TimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(
                fields=["parent", "name"],
                name="unique_category_name_per_parent",
            )
        ]

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    class Unit(models.TextChoices):
        PCS = "pcs", "Pieces"
        KG = "kg", "Kilograms"
        G = "g", "Grams"
        L = "l", "Liters"
        ML = "ml", "Milliliters"
        BOX = "box", "Box"
        PACK = "pack", "Pack"

    sku = models.CharField(max_length=64, unique=True)
    barcode = models.CharField(max_length=64, unique=True, null=True, blank=True, default=None)
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    preferred_supplier = models.ForeignKey(
        "suppliers.Supplier",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="products",
    )
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    reorder_level = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
    )
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.PCS)
    is_active = models.BooleanField(default=True)
    image = models.ImageField(upload_to="products/", blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.sku} {self.name}"
