from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField("email address", unique=True)
    phone = models.CharField(max_length=30, blank=True)

    def __str__(self):
        return self.username
