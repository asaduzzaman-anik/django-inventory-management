import pytest


@pytest.fixture(autouse=True)
def isolated_media_root(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path / "media"


@pytest.fixture(autouse=True)
def isolated_cache_and_broker(settings, monkeypatch):
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "tests",
        }
    }
    monkeypatch.setattr("apps.notifications.tasks.send_notification_email.delay", lambda *args, **kwargs: None)
    monkeypatch.setattr("apps.notifications.tasks.evaluate_stock_alert.delay", lambda *args, **kwargs: None)
