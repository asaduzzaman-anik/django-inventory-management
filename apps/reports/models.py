from django.db import models


class Report(models.Model):
    """Permission anchor. Report rows are computed, not stored."""

    class Meta:
        managed = False
        default_permissions = ()
        permissions = [
            ("view_reports", "Can view reports"),
            ("export_reports", "Can export reports"),
        ]
