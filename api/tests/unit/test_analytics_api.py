"""
UT-008: POST /api/analytics/pageview — PV 記録
UT-009: GET /api/analytics/dashboard — ダッシュボード
"""
import pytest
from unittest.mock import patch, MagicMock
import uuid


SESSION_ID = str(uuid.uuid4())


class TestRecordPageview:
    def test_records_pageview(self, client, mock_db):
        """正常: PV 記録 -> 202 recorded=True"""
        resp = client.post(
            "/api/analytics/pageview",
            json={"novel_slug": "stellar-drift", "session_id": SESSION_ID},
        )
        assert resp.status_code == 201
        assert resp.json() == {"recorded": True}

    def test_with_chapter_number(self, client, mock_db):
        """chapter_number 付きで記録"""
        resp = client.post(
            "/api/analytics/pageview",
            json={
                "novel_slug": "stellar-drift",
                "chapter_number": 3,
                "session_id": SESSION_ID,
            },
        )
        assert resp.status_code == 201
        assert resp.json()["recorded"] is True

    def test_invalid_slug(self, client, mock_db):
        """422: 不正な novel_slug"""
        resp = client.post(
            "/api/analytics/pageview",
            json={"novel_slug": "INVALID SLUG!", "session_id": SESSION_ID},
        )
        assert resp.status_code == 422

    def test_invalid_chapter_number(self, client, mock_db):
        """422: chapter_number < 1"""
        resp = client.post(
            "/api/analytics/pageview",
            json={
                "novel_slug": "stellar-drift",
                "chapter_number": 0,
                "session_id": SESSION_ID,
            },
        )
        assert resp.status_code == 422

    def test_no_session_id(self, client, mock_db):
        """session_id なしでも記録される（自動採番）"""
        resp = client.post(
            "/api/analytics/pageview",
            json={"novel_slug": "stellar-drift"},
        )
        assert resp.status_code == 201
        assert resp.json()["recorded"] is True


class TestDashboard:
    def test_returns_dashboard(self, client, mock_db):
        """正常: ダッシュボードデータが返る"""
        with patch("services.analytics_service.get_dashboard") as mock_dash:
            mock_dash.return_value = {
                "period_days": 30,
                "total_pageviews": 100,
                "novels": [],
                "daily_trend": [],
            }
            resp = client.get("/api/analytics/dashboard")
            assert resp.status_code == 200
            body = resp.json()
            assert body["period_days"] == 30
            assert body["total_pageviews"] == 100
            assert "novels" in body
            assert "daily_trend" in body

    def test_days_param(self, client, mock_db):
        """days パラメータが service に渡される"""
        with patch("services.analytics_service.get_dashboard") as mock_dash:
            mock_dash.return_value = {
                "period_days": 7,
                "total_pageviews": 0,
                "novels": [],
                "daily_trend": [],
            }
            resp = client.get("/api/analytics/dashboard?days=7")
            assert resp.status_code == 200
            mock_dash.assert_called_once()
            _, days_arg = mock_dash.call_args[0]
            assert days_arg == 7

    def test_days_out_of_range(self, client, mock_db):
        """422: days=0 は無効"""
        resp = client.get("/api/analytics/dashboard?days=0")
        assert resp.status_code == 422

    def test_days_max(self, client, mock_db):
        """days=365 は有効"""
        with patch("services.analytics_service.get_dashboard") as mock_dash:
            mock_dash.return_value = {
                "period_days": 365,
                "total_pageviews": 0,
                "novels": [],
                "daily_trend": [],
            }
            resp = client.get("/api/analytics/dashboard?days=365")
            assert resp.status_code == 200
