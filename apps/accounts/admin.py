from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.accounts.models import User


@admin.register(User)
class AccountUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Contact", {"fields": ("phone",)}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "phone", "password1", "password2"),
            },
        ),
    )
