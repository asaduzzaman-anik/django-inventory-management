from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField("email address", unique=True)
    phone = models.CharField(max_length=30, blank=True)

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        permissions = [
            ("manage_users", "Can manage users"),
        ]

    def __str__(self):
        return self.username


class UserWarehouse(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="warehouse_assignments",
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.PROTECT,
        related_name="assignments",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "warehouse"], name="unique_user_warehouse"),
        ]

    def __str__(self):
        return f"{self.user} @ {self.warehouse}"
