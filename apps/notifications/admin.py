from django.contrib import admin

from apps.notifications.models import Notification, StockAlertState


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "recipient", "category", "title", "read_at")
    list_filter = ("category",)


@admin.register(StockAlertState)
class StockAlertStateAdmin(admin.ModelAdmin):
    list_display = ("alert_type", "product", "warehouse", "last_notified_at")
