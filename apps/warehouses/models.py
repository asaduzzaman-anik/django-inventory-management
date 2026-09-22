from django.db import models

from apps.common.models import TimeStampedModel


class Warehouse(TimeStampedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=32, unique=True)
    address_line = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=120, blank=True)
    contact_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} {self.name}"
