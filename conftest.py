import pytest


@pytest.fixture(autouse=True)
def isolated_media_root(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path / "media"
