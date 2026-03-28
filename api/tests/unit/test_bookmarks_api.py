"""
UT-005: POST /api/bookmarks — ブックマーク作成
UT-006: GET /api/bookmarks — ブックマーク一覧
UT-007: DELETE /api/bookmarks/{novel_slug} — ブックマーク削除
"""
import pytest
from unittest.mock import patch, MagicMock
import datetime
import uuid


SESSION_ID = str(uuid.uuid4())


def _make_bookmark(session_id=None, novel_slug="stellar-drift", chapter=1):
    bm = MagicMock()
    bm.id = 1
    bm.session_id = session_id or SESSION_ID
    bm.novel_slug = novel_slug
    bm.chapter_number = chapter
    bm.created_at = datetime.datetime(2026, 3, 1)
    return bm


# ---- UT-006: GET /api/bookmarks ----

class TestListBookmarks:
    def test_returns_bookmarks(self, client, mock_db):
        """正常: セッションのブックマーク一覧"""
        bm = _make_bookmark(session_id=SESSION_ID)
        mock_db.query.return_value.filter.return_value.all.return_value = [bm]

        resp = client.get("/api/bookmarks", headers={"X-Session-ID": SESSION_ID})
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 1
        assert body[0]["novel_slug"] == "stellar-drift"

    def test_empty_list(self, client, mock_db):
        """空リスト"""
        mock_db.query.return_value.filter.return_value.all.return_value = []

        resp = client.get("/api/bookmarks", headers={"X-Session-ID": SESSION_ID})
        assert resp.status_code == 200
        assert resp.json() == []

    def test_missing_session_header(self, client, mock_db):
        """400: X-Session-ID ヘッダーなし"""
        resp = client.get("/api/bookmarks")
        assert resp.status_code in (400, 422)

    def test_invalid_session_id(self, client, mock_db):
        """400: 不正な UUID"""
        resp = client.get("/api/bookmarks", headers={"X-Session-ID": "not-a-uuid"})
        assert resp.status_code == 400


# ---- UT-005: POST /api/bookmarks ----

class TestCreateBookmark:
    def test_creates_bookmark(self, client, mock_db):
        """正常: ブックマーク作成"""
        bm = _make_bookmark(session_id=SESSION_ID)

        with patch("services.bookmark_service.upsert_bookmark") as mock_upsert:
            mock_upsert.return_value = {
                "id": 1,
                "session_id": SESSION_ID,
                "novel_slug": "stellar-drift",
                "chapter_number": 1,
                "created_at": "2026-03-01T00:00:00",
            }
            resp = client.post(
                "/api/bookmarks",
                json={"novel_slug": "stellar-drift", "chapter_number": 1},
                headers={"X-Session-ID": SESSION_ID},
            )
            assert resp.status_code == 201
            body = resp.json()
            assert body["novel_slug"] == "stellar-drift"

    def test_invalid_slug(self, client, mock_db):
        """422: 不正な novel_slug"""
        resp = client.post(
            "/api/bookmarks",
            json={"novel_slug": "INVALID SLUG!", "chapter_number": 1},
            headers={"X-Session-ID": SESSION_ID},
        )
        assert resp.status_code == 422

    def test_invalid_chapter_number(self, client, mock_db):
        """422: chapter_number < 1"""
        resp = client.post(
            "/api/bookmarks",
            json={"novel_slug": "stellar-drift", "chapter_number": 0},
            headers={"X-Session-ID": SESSION_ID},
        )
        assert resp.status_code == 422

    def test_novel_not_found(self, client, mock_db):
        """404: 存在しない novel_slug"""
        with patch("services.bookmark_service.upsert_bookmark") as mock_upsert:
            from fastapi import HTTPException
            mock_upsert.side_effect = HTTPException(status_code=404, detail="Novel not found")
            resp = client.post(
                "/api/bookmarks",
                json={"novel_slug": "unknown-novel", "chapter_number": 1},
                headers={"X-Session-ID": SESSION_ID},
            )
            assert resp.status_code == 404


# ---- UT-007: DELETE /api/bookmarks/{novel_slug} ----

class TestDeleteBookmark:
    def test_deletes_bookmark(self, client, mock_db):
        """正常: ブックマーク削除"""
        with patch("services.bookmark_service.delete_bookmark") as mock_delete:
            mock_delete.return_value = {"deleted": True}
            resp = client.delete(
                "/api/bookmarks/stellar-drift",
                headers={"X-Session-ID": SESSION_ID},
            )
            assert resp.status_code == 200
            assert resp.json() == {"deleted": True}

    def test_not_found(self, client, mock_db):
        """404: 存在しないブックマーク"""
        with patch("services.bookmark_service.delete_bookmark") as mock_delete:
            from fastapi import HTTPException
            mock_delete.side_effect = HTTPException(status_code=404, detail="Bookmark not found")
            resp = client.delete(
                "/api/bookmarks/unknown-novel",
                headers={"X-Session-ID": SESSION_ID},
            )
            assert resp.status_code == 404
