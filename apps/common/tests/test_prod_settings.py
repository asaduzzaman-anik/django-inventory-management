import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DROPPED = (
    "SECRET_KEY",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DB_HOST",
    "DB_PORT",
    "DEBUG",
    "ALLOWED_HOSTS",
    "JWT_SIGNING_KEY",
)


def _run(tmp_path, **overrides):
    env = {key: value for key, value in os.environ.items() if key not in DROPPED}
    env.update(
        {
            "DJANGO_SETTINGS_MODULE": "config.settings.prod",
            "PYTHONPATH": str(ROOT),
            "SECRET_KEY": "prod-secret-key-value",
            "DB_NAME": "inventory_management",
            "DB_USER": "root",
            "DB_PASSWORD": "secret",
            "ALLOWED_HOSTS": "inventory.example.com",
            "JWT_SIGNING_KEY": "prod-jwt-signing-key",
            "DEBUG": "False",
        }
    )
    env.update(overrides)
    return subprocess.run(
        [sys.executable, "-c", "import django; django.setup()"],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_production_refuses_a_missing_secret(tmp_path):
    result = _run(tmp_path, SECRET_KEY="")
    assert result.returncode != 0
    assert "SECRET_KEY is required in production" in result.stderr


def test_production_refuses_a_missing_database_name(tmp_path):
    result = _run(tmp_path, DB_NAME="")
    assert result.returncode != 0
    assert "DB_NAME is required in production" in result.stderr


def test_production_refuses_debug(tmp_path):
    result = _run(tmp_path, DEBUG="True")
    assert result.returncode != 0
    assert "DEBUG cannot be true in production" in result.stderr


def test_production_starts_when_required_settings_exist(tmp_path):
    result = _run(tmp_path)
    assert result.returncode == 0, result.stderr
