"""
UT-003: GET /api/novels/{slug}/chapters/{number} — 章コンテンツ
"""
import pytest
from unittest.mock import MagicMock
import datetime


def _make_chapter(slug="stellar-drift", number=1):
    ch = MagicMock()
    ch.id = 1
    ch.novel_slug = slug
    ch.number = number
    ch.title = f"第{number}話"
    ch.content = "本文テキスト " * 100
    ch.illustrations = []
    ch.published_at = datetime.datetime(2026, 1, 1)
    return ch


class TestGetChapter:
    def test_returns_200(self, client, mock_db):
        """正常: 存在する章を取得"""
        ch = _make_chapter()
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.first.return_value = ch

        resp = client.get("/api/novels/stellar-drift/chapters/1")
        assert resp.status_code == 200
        body = resp.json()
        assert body["novel_slug"] == "stellar-drift"
        assert body["number"] == 1
        assert "content" in body
        assert "illustrations" in body

    def test_not_found(self, client, mock_db):
        """404: 存在しない章番号"""
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.first.return_value = None

        resp = client.get("/api/novels/stellar-drift/chapters/999")
        assert resp.status_code == 404

    def test_invalid_chapter_number_zero(self, client, mock_db):
        """422: chapter number = 0 は無効"""
        resp = client.get("/api/novels/stellar-drift/chapters/0")
        assert resp.status_code == 422

    def test_with_illustrations(self, client, mock_db):
        """イラスト付き章のレスポンス"""
        ch = _make_chapter()
        ill = MagicMock()
        ill.id = 1
        ill.image_path = "/images/test.png"
        ill.alt_text = "テスト画像"
        ill.position = 2
        ch.illustrations = [ill]

        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.first.return_value = ch

        resp = client.get("/api/novels/stellar-drift/chapters/1")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["illustrations"]) == 1
        assert body["illustrations"][0]["image_path"] == "/images/test.png"

    def test_invalid_slug_format(self, client, mock_db):
        """400: 不正な slug"""
        resp = client.get("/api/novels/INVALID_SLUG/chapters/1")
        assert resp.status_code == 400
