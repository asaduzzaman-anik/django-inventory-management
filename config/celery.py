"""Celery application.

Worker:

    celery -A config worker -l info

Beat (hourly low-stock scan):

    celery -A config beat -l info

Run one beat process. Redis database 0 is the broker. Database 1 is the cache.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("inventory")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
