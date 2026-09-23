"""Production settings. DEBUG stays off, and required secrets have no defaults."""

from django.core.exceptions import ImproperlyConfigured
from decouple import Csv, UndefinedValueError, config

from .base import *  # noqa: F403

def _required(name, value):
    if value is None or str(value).strip() == "":
        raise ImproperlyConfigured(f"{name} is required in production.")


if config("DEBUG", default=False, cast=bool):
    raise ImproperlyConfigured("DEBUG cannot be true in production.")

DEBUG = False

_required("SECRET_KEY", SECRET_KEY)  # noqa: F405
_required("DB_NAME", DATABASES["default"]["NAME"])  # noqa: F405
_required("DB_USER", DATABASES["default"]["USER"])  # noqa: F405
_required("DB_PASSWORD", DATABASES["default"]["PASSWORD"])  # noqa: F405

try:
    hosts = config("ALLOWED_HOSTS", cast=Csv())
except UndefinedValueError as exc:
    raise ImproperlyConfigured("ALLOWED_HOSTS is required in production.") from exc
if not any(str(host).strip() for host in hosts):
    raise ImproperlyConfigured("ALLOWED_HOSTS is required in production.")
ALLOWED_HOSTS = hosts

try:
    signing_key = config("JWT_SIGNING_KEY")
except UndefinedValueError as exc:
    raise ImproperlyConfigured("JWT_SIGNING_KEY is required in production.") from exc
_required("JWT_SIGNING_KEY", signing_key)
SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": signing_key}  # noqa: F405

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "plain"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
