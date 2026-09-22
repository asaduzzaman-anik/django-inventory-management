from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.accounts.roles import ROLE_PERMISSIONS


class Command(BaseCommand):
    help = "Create the application roles and attach their permissions."

    def handle(self, *args, **options):
        for role_name, permission_labels in ROLE_PERMISSIONS.items():
            group, _created = Group.objects.get_or_create(name=role_name)
            group.permissions.set(self._permissions(permission_labels))

        super_admin = Group.objects.get(name="Super Admin")
        for user in User.objects.filter(is_superuser=True):
            user.groups.add(super_admin)

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(ROLE_PERMISSIONS)} roles."))

    def _permissions(self, labels):
        permissions = []
        for label in labels:
            app_label, codename = label.split(".")
            permissions.append(
                Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename,
                )
            )
        return permissions
