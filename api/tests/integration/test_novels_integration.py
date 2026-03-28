"""
INT-001: GET /api/novels — 実 DB での一覧取得
INT-002: GET /api/novels/{slug} — 実 DB での詳細取得
INT-003: GET /api/novels/{slug}/chapters/{number} — 実 DB での章取得
"""
import pytest
from .conftest import make_novel, make_chapter


class TestNovelsIntegration:
    def test_list_novels_returns_db_data(self, client, db):
        """実 DB に INSERT した novel が一覧に含まれる"""
        novel = make_novel(db, slug="int-test-novel-list", genre="sf")

        resp = client.get("/api/novels")
        assert resp.status_code == 200
        body = resp.json()
        slugs = [item["slug"] for item in body["items"]]
        assert "int-test-novel-list" in slugs

    def test_list_novels_genre_filter(self, client, db):
        """genre フィルタが実 DB に対して正しく動作する"""
        make_novel(db, slug="int-test-sf-novel", genre="sf")
        make_novel(db, slug="int-test-fantasy-novel", genre="fantasy")

        resp = client.get("/api/novels?genre=sf")
        assert resp.status_code == 200
        body = resp.json()
        genres = [item["genre"] for item in body["items"]]
        assert all(g == "sf" for g in genres)
        slugs = [item["slug"] for item in body["items"]]
        assert "int-test-sf-novel" in slugs
        assert "int-test-fantasy-novel" not in slugs

    def test_list_novels_sort_rating_desc(self, client, db):
        """rating 降順ソートが実 DB で正しく動作する"""
        make_novel(db, slug="int-test-low-rating", rating=1.0)
        make_novel(db, slug="int-test-high-rating", rating=5.0)

        resp = client.get("/api/novels?sort=rating_desc")
        assert resp.status_code == 200
        items = resp.json()["items"]
        # rating が降順になっていること
        ratings = [item["rating"] for item in items]
        assert ratings == sorted(ratings, reverse=True)

    def test_list_novels_pagination(self, client, db):
        """ページネーション: limit=1 で 1 件のみ返る"""
        make_novel(db, slug="int-test-page-a")
        make_novel(db, slug="int-test-page-b")

        resp = client.get("/api/novels?limit=1&offset=0")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) == 1
        # total は全件数
        assert body["total"] >= 2


class TestNovelDetailIntegration:
    def test_get_novel_by_slug(self, client, db):
        """slug で novel 詳細が取得できる"""
        make_novel(db, slug="int-test-detail")

        resp = client.get("/api/novels/int-test-detail")
        assert resp.status_code == 200
        body = resp.json()
        assert body["slug"] == "int-test-detail"
        assert "chapters" in body

    def test_get_novel_includes_chapters(self, client, db):
        """chapters が正しく含まれる"""
        novel = make_novel(db, slug="int-test-with-chapters")
        make_chapter(db, novel_slug="int-test-with-chapters", number=1)
        make_chapter(db, novel_slug="int-test-with-chapters", number=2)

        resp = client.get("/api/novels/int-test-with-chapters")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["chapters"]) == 2
        numbers = [ch["number"] for ch in body["chapters"]]
        assert sorted(numbers) == [1, 2]

    def test_get_novel_not_found(self, client, db):
        """存在しない slug は 404"""
        resp = client.get("/api/novels/int-test-nonexistent-novel-xyz")
        assert resp.status_code == 404


class TestChapterIntegration:
    def test_get_chapter_content(self, client, db):
        """章コンテンツが実 DB から取得できる"""
        make_novel(db, slug="int-test-chapter-novel")
        make_chapter(db, novel_slug="int-test-chapter-novel", number=1, title="第1話テスト", content="本文テスト")

        resp = client.get("/api/novels/int-test-chapter-novel/chapters/1")
        assert resp.status_code == 200
        body = resp.json()
        assert body["novel_slug"] == "int-test-chapter-novel"
        assert body["number"] == 1
        assert body["title"] == "第1話テスト"
        assert body["content"] == "本文テスト"

    def test_get_chapter_not_found(self, client, db):
        """存在しない章番号は 404"""
        make_novel(db, slug="int-test-no-chapter")

        resp = client.get("/api/novels/int-test-no-chapter/chapters/99")
        assert resp.status_code == 404

    def test_chapter_ordering(self, client, db):
        """複数章が number 順に返る"""
        make_novel(db, slug="int-test-chapter-order")
        make_chapter(db, novel_slug="int-test-chapter-order", number=3)
        make_chapter(db, novel_slug="int-test-chapter-order", number=1)
        make_chapter(db, novel_slug="int-test-chapter-order", number=2)

        resp = client.get("/api/novels/int-test-chapter-order")
        assert resp.status_code == 200
        chapters = resp.json()["chapters"]
        numbers = [ch["number"] for ch in chapters]
        assert numbers == [1, 2, 3]
