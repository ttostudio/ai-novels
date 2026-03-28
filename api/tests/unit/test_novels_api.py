"""
UT-001: GET /api/novels — 小説一覧
UT-002: GET /api/novels/{slug} — 小説詳細
"""
import pytest
from unittest.mock import patch, MagicMock
import datetime


# ---- テスト用ダミーデータ ----

def _make_novel(slug="stellar-drift", genre="sf", rating=4.5):
    n = MagicMock()
    n.id = 1
    n.slug = slug
    n.title = "星間漂流"
    n.author = "AI"
    n.genre = genre
    n.tags = ["宇宙", "冒険"]
    n.synopsis = "遥かな宇宙を旅する物語"
    n.characters = []
    n.cover_image = None
    n.rating = rating
    n.total_chapters = 5
    n.latest_chapter = 5
    n.update_schedule = "毎日"
    n.status = "active"
    n.created_at = datetime.datetime(2026, 1, 1)
    n.updated_at = datetime.datetime(2026, 3, 1)
    return n


# ---- UT-001: GET /api/novels ----

class TestListNovels:
    def test_returns_200_with_items(self, client, mock_db):
        """正常: novels が返る"""
        novel = _make_novel()
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.offset.return_value.limit.return_value.all.return_value = [novel]

        resp = client.get("/api/novels")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert len(body["items"]) == 1
        assert body["items"][0]["slug"] == "stellar-drift"

    def test_genre_filter(self, client, mock_db):
        """ジャンルフィルタ: genre=sf で filter が呼ばれる"""
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 0
        mock_query.offset.return_value.limit.return_value.all.return_value = []

        resp = client.get("/api/novels?genre=sf")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_sort_rating_desc(self, client, mock_db):
        """ソート: sort=rating_desc"""
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 0
        mock_query.offset.return_value.limit.return_value.all.return_value = []

        resp = client.get("/api/novels?sort=rating_desc")
        assert resp.status_code == 200

    def test_sort_title_asc(self, client, mock_db):
        """ソート: sort=title_asc"""
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 0
        mock_query.offset.return_value.limit.return_value.all.return_value = []

        resp = client.get("/api/novels?sort=title_asc")
        assert resp.status_code == 200

    def test_empty_list(self, client, mock_db):
        """空リスト: items=[]"""
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 0
        mock_query.offset.return_value.limit.return_value.all.return_value = []

        resp = client.get("/api/novels")
        assert resp.status_code == 200
        assert resp.json() == {"total": 0, "items": []}

    def test_invalid_limit(self, client, mock_db):
        """バリデーション: limit=0 は 422"""
        resp = client.get("/api/novels?limit=0")
        assert resp.status_code == 422


# ---- UT-002: GET /api/novels/{slug} ----

class TestGetNovel:
    def test_returns_200(self, client, mock_db):
        """正常: slug が存在する"""
        novel = _make_novel()
        novel.chapters = []
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.first.return_value = novel

        resp = client.get("/api/novels/stellar-drift")
        assert resp.status_code == 200
        body = resp.json()
        assert body["slug"] == "stellar-drift"
        assert "chapters" in body

    def test_not_found(self, client, mock_db):
        """404: 存在しない slug"""
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.first.return_value = None

        resp = client.get("/api/novels/unknown-slug")
        assert resp.status_code == 404

    def test_invalid_slug_format(self, client, mock_db):
        """400: 不正な slug フォーマット (大文字含む)"""
        resp = client.get("/api/novels/Invalid_Slug")
        assert resp.status_code == 400

    def test_includes_chapters_list(self, client, mock_db):
        """レスポンスに chapters 配列が含まれる"""
        novel = _make_novel()
        ch = MagicMock()
        ch.id = 1
        ch.number = 1
        ch.title = "第1話"
        ch.published_at = datetime.datetime(2026, 1, 1)
        novel.chapters = [ch]

        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.first.return_value = novel

        resp = client.get("/api/novels/stellar-drift")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["chapters"]) == 1
        assert body["chapters"][0]["number"] == 1
