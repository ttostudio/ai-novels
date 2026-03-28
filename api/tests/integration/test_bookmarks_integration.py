"""
INT-005: POST /api/bookmarks — 実 DB へのブックマーク保存
INT-006: GET/DELETE /api/bookmarks — 実 DB でのブックマーク取得・削除
"""
import pytest
import uuid
from .conftest import make_novel, make_bookmark


SESSION_A = str(uuid.uuid4())
SESSION_B = str(uuid.uuid4())


class TestBookmarkIntegration:
    def test_create_bookmark(self, client, db):
        """ブックマークが実 DB に保存される"""
        make_novel(db, slug="int-bm-create")

        resp = client.post(
            "/api/bookmarks",
            json={"novel_slug": "int-bm-create", "chapter_number": 1},
            headers={"X-Session-ID": SESSION_A},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["novel_slug"] == "int-bm-create"
        assert body["chapter_number"] == 1
        assert body["session_id"] == SESSION_A

    def test_get_bookmarks(self, client, db):
        """INSERT したブックマークが GET で取得できる"""
        make_novel(db, slug="int-bm-get")
        make_bookmark(db, SESSION_A, "int-bm-get", chapter_number=2)

        resp = client.get("/api/bookmarks", headers={"X-Session-ID": SESSION_A})
        assert resp.status_code == 200
        items = resp.json()
        slugs = [item["novel_slug"] for item in items]
        assert "int-bm-get" in slugs

    def test_session_isolation(self, client, db):
        """別セッションのブックマークは見えない"""
        make_novel(db, slug="int-bm-isolation")
        make_bookmark(db, SESSION_A, "int-bm-isolation")

        # SESSION_B は SESSION_A のブックマークを見えない
        resp = client.get("/api/bookmarks", headers={"X-Session-ID": SESSION_B})
        assert resp.status_code == 200
        items = resp.json()
        slugs = [item["novel_slug"] for item in items]
        assert "int-bm-isolation" not in slugs

    def test_upsert_bookmark(self, client, db):
        """同一 (session, novel) でブックマークが上書きされる"""
        make_novel(db, slug="int-bm-upsert")

        # 1回目: chapter=1
        resp = client.post(
            "/api/bookmarks",
            json={"novel_slug": "int-bm-upsert", "chapter_number": 1},
            headers={"X-Session-ID": SESSION_A},
        )
        assert resp.status_code == 201

        # 2回目: chapter=3 に更新
        resp = client.post(
            "/api/bookmarks",
            json={"novel_slug": "int-bm-upsert", "chapter_number": 3},
            headers={"X-Session-ID": SESSION_A},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["chapter_number"] == 3

        # GET で chapter=3 が返る
        resp = client.get("/api/bookmarks", headers={"X-Session-ID": SESSION_A})
        bm_list = [b for b in resp.json() if b["novel_slug"] == "int-bm-upsert"]
        assert len(bm_list) == 1
        assert bm_list[0]["chapter_number"] == 3

    def test_delete_bookmark(self, client, db):
        """ブックマーク削除後は取得できない"""
        make_novel(db, slug="int-bm-delete")
        make_bookmark(db, SESSION_A, "int-bm-delete")

        resp = client.delete(
            "/api/bookmarks/int-bm-delete",
            headers={"X-Session-ID": SESSION_A},
        )
        assert resp.status_code == 200
        assert resp.json() == {"deleted": True}

        # 削除後は GET で見えない
        resp = client.get("/api/bookmarks", headers={"X-Session-ID": SESSION_A})
        slugs = [b["novel_slug"] for b in resp.json()]
        assert "int-bm-delete" not in slugs

    def test_delete_not_found(self, client, db):
        """存在しないブックマーク削除は 404"""
        resp = client.delete(
            "/api/bookmarks/nonexistent-novel-xyz",
            headers={"X-Session-ID": SESSION_A},
        )
        assert resp.status_code == 404

    def test_create_bookmark_novel_not_found(self, client, db):
        """存在しない novel へのブックマークは 404"""
        resp = client.post(
            "/api/bookmarks",
            json={"novel_slug": "novel-does-not-exist-xyz", "chapter_number": 1},
            headers={"X-Session-ID": SESSION_A},
        )
        assert resp.status_code == 404
