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
        if set(data.keys()) == {"detail"}:
            detail = str(data["detail"])
        else:
            errors = data
            detail = "Validation failed."
    elif isinstance(data, list) and data:
        detail = str(data[0])

    response.data = {
        "code": _error_code(response.status_code),
        "detail": detail,
        "errors": errors,
    }
    return response


def _error_code(status_code):
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
    return "error"
