from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        if settings.DEBUG:
            return None
        return Response(
            {
                "code": "server_error",
                "detail": "An unexpected error occurred.",
                "errors": {},
            },
            status=500,
        )

    data = response.data
    errors = {}
    detail = "Request failed."

    if isinstance(data, dict):
        field_errors = {
            key: value
            for key, value in data.items()
            if key not in {"detail", "code"}
        }
        if "detail" in data and not field_errors:
            detail = str(data["detail"])
        else:
            errors = field_errors or data
            detail = "Validation failed."
    elif isinstance(data, list) and data:
        detail = str(data[0])

    response.data = {
        "code": _error_code(response.status_code, exc),
        "detail": detail,
        "errors": errors,
    }
    return response


def _error_code(status_code, exc=None):
    if getattr(exc, "default_code", "") == "business_rule":
        return "business_rule"
    if status_code == 400:
        return "validation_error"
    if status_code == 401:
        return "not_authenticated"
    if status_code == 403:
        return "permission_denied"
    if status_code == 404:
        return "not_found"
    if status_code == 409:
        return "conflict"
    if status_code == 429:
        return "throttled"
    return "error"
