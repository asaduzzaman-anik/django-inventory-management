from django.test import Client


def test_health_returns_ok():
    response = Client().get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_vite_origin_is_allowed():
    response = Client().get("/api/v1/health/", HTTP_ORIGIN="http://localhost:5173")
    assert response.status_code == 200
    assert response["Access-Control-Allow-Origin"] == "http://localhost:5173"
