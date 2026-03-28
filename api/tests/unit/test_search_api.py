"""
UT-004: GET /api/novels/search — 全文検索
"""
import pytest
from unittest.mock import patch, MagicMock


def _make_search_result(slug, title, match_type="title"):
    return {
        "slug": slug,
        "title": title,
        "genre": "sf",
        "synopsis": "テスト用あらすじ",
        "cover_image": None,
        "rating": 4.5,
        "match_type": match_type,
    }


class TestSearchNovels:
    def test_title_match(self, client, mock_db):
        """タイトルマッチで結果が返る"""
        with patch("services.search_service.search_novels") as mock_search:
            mock_search.return_value = {
                "total": 1,
                "items": [_make_search_result("stellar-drift", "星間漂流")],
            }
            resp = client.get("/api/novels/search?q=星間")
            assert resp.status_code == 200
            body = resp.json()
            assert body["total"] == 1
            assert body["items"][0]["match_type"] == "title"

    def test_synopsis_match(self, client, mock_db):
        """あらすじマッチで結果が返る"""
        with patch("services.search_service.search_novels") as mock_search:
            mock_search.return_value = {
                "total": 1,
                "items": [_make_search_result("daily-life", "日常茶飯事", match_type="synopsis")],
            }
            resp = client.get("/api/novels/search?q=日常")
            assert resp.status_code == 200
            body = resp.json()
            assert body["items"][0]["match_type"] == "synopsis"

    def test_no_hits(self, client, mock_db):
        """ヒットなし: total=0"""
        with patch("services.search_service.search_novels") as mock_search:
            mock_search.return_value = {"total": 0, "items": []}
            resp = client.get("/api/novels/search?q=xyzxyzxyz存在しない")
            assert resp.status_code == 200
            assert resp.json() == {"total": 0, "items": []}

    def test_missing_q_param(self, client, mock_db):
        """422: q パラメータ必須"""
        resp = client.get("/api/novels/search")
        assert resp.status_code == 422

    def test_q_too_long(self, client, mock_db):
        """422: q が 100文字超え"""
        q = "a" * 101
        resp = client.get(f"/api/novels/search?q={q}")
        assert resp.status_code == 422

    def test_pagination(self, client, mock_db):
        """ページネーション: limit と offset が渡される"""
        with patch("services.search_service.search_novels") as mock_search:
            mock_search.return_value = {"total": 0, "items": []}
            resp = client.get("/api/novels/search?q=test&limit=5&offset=10")
            assert resp.status_code == 200
            mock_search.assert_called_once()
            _, q_arg, limit_arg, offset_arg = mock_search.call_args[0]
            assert q_arg == "test"
            assert limit_arg == 5
            assert offset_arg == 10
