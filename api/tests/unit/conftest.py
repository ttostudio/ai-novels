"""
ユニットテスト用フィクスチャ: DB 依存関係をモックに差し替える
"""
import os
import sys
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

# api/ ディレクトリを sys.path に追加
_api_dir = os.path.join(os.path.dirname(__file__), "..", "..")
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

os.environ.setdefault("DATABASE_URL", "postgresql://novels:novels_password@localhost:5434/novels")

from main import app  # noqa: E402
from dependencies import get_db  # noqa: E402


@pytest.fixture
def mock_db():
    """モック DB セッション"""
    return MagicMock()


@pytest.fixture
def client(mock_db):
    """DB 依存をモックに差し替えた TestClient"""
    app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
