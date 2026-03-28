"""
INT-007: POST /api/analytics/pageview — 実 DB での PV 記録
INT-008: GET /api/analytics/dashboard — 実 DB でのダッシュボード集計
"""
import pytest
import uuid
import time
from .conftest import make_novel, make_pageview


SESSION_ID = str(uuid.uuid4())


class TestAnalyticsIntegration:
    def test_record_pageview(self, client, db):
        """PV が実 DB に記録される"""
        make_novel(db, slug="int-analytics-pv")

        resp = client.post(
            "/api/analytics/pageview",
            json={
                "novel_slug": "int-analytics-pv",
                "chapter_number": 1,
                "session_id": SESSION_ID,
            },
        )
        assert resp.status_code == 201
        assert resp.json()["recorded"] is True

    def test_dashboard_counts_pageviews(self, client, db):
        """ダッシュボードが実 DB の PV を集計する"""
        make_novel(db, slug="int-analytics-dashboard")
        make_pageview(db, "int-analytics-dashboard", chapter_number=1, session_id=str(uuid.uuid4()))
        make_pageview(db, "int-analytics-dashboard", chapter_number=2, session_id=str(uuid.uuid4()))
        make_pageview(db, "int-analytics-dashboard", chapter_number=1, session_id=str(uuid.uuid4()))

        resp = client.get("/api/analytics/dashboard?days=30")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_pageviews"] >= 3
        assert "novels" in body
        assert "daily_trend" in body

    def test_dashboard_novel_stats(self, client, db):
        """ダッシュボードの novels リストに PV を記録した小説が含まれる"""
        make_novel(db, slug="int-analytics-novel-stats")
        session1 = str(uuid.uuid4())
        session2 = str(uuid.uuid4())
        make_pageview(db, "int-analytics-novel-stats", session_id=session1)
        make_pageview(db, "int-analytics-novel-stats", session_id=session2)

        resp = client.get("/api/analytics/dashboard?days=30")
        assert resp.status_code == 200
        body = resp.json()

        slugs = [n["slug"] for n in body["novels"]]
        assert "int-analytics-novel-stats" in slugs

        novel_data = next(n for n in body["novels"] if n["slug"] == "int-analytics-novel-stats")
        assert novel_data["pageviews"] >= 2
        assert novel_data["unique_sessions"] >= 2

    def test_dashboard_period_filter(self, client, db):
        """days パラメータで集計期間が絞られる"""
        resp = client.get("/api/analytics/dashboard?days=1")
        assert resp.status_code == 200
        body = resp.json()
        assert body["period_days"] == 1

    def test_dashboard_empty(self, client, db):
        """PV がない場合、total_pageviews=0 以上で正常に返る"""
        resp = client.get("/api/analytics/dashboard?days=365")
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body["total_pageviews"], int)
        assert body["total_pageviews"] >= 0
        assert isinstance(body["novels"], list)
        assert isinstance(body["daily_trend"], list)

    def test_pageview_auto_session(self, client, db):
        """session_id なしでも PV が記録される（自動 UUID 採番）"""
        make_novel(db, slug="int-analytics-auto-session")

        resp = client.post(
            "/api/analytics/pageview",
            json={"novel_slug": "int-analytics-auto-session"},
        )
        assert resp.status_code == 201
        assert resp.json()["recorded"] is True
