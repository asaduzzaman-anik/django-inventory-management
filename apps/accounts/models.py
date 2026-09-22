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
