from sqlalchemy.orm import Session
from sqlalchemy import func, text
from models.analytics import PageView
from models.novel import Novel
import datetime
import uuid


def record_pageview(
    db: Session,
    novel_slug: str,
    chapter_number: int | None,
    session_id: str | None,
) -> None:
    # session_id が不正な UUID の場合は新規採番
    if session_id:
        try:
            uuid.UUID(session_id)
        except (ValueError, AttributeError):
            session_id = str(uuid.uuid4())
    else:
        session_id = str(uuid.uuid4())

    pv = PageView(
        novel_slug=novel_slug,
        chapter_number=chapter_number,
        session_id=session_id,
    )
    db.add(pv)
    db.commit()


def get_dashboard(db: Session, days: int) -> dict:
    since = datetime.datetime.utcnow() - datetime.timedelta(days=days)

    total_pv = (
        db.query(func.count(PageView.id))
        .filter(PageView.viewed_at >= since)
        .scalar()
    ) or 0

    novel_stats = (
        db.query(
            PageView.novel_slug,
            func.count(PageView.id).label("pageviews"),
            func.count(func.distinct(PageView.session_id)).label("unique_sessions"),
        )
        .filter(PageView.viewed_at >= since)
        .group_by(PageView.novel_slug)
        .all()
    )

    slug_to_title = {
        n.slug: n.title
        for n in db.query(Novel.slug, Novel.title).all()
    }

    novels_data = [
        {
            "slug": row.novel_slug,
            "title": slug_to_title.get(row.novel_slug, row.novel_slug),
            "pageviews": row.pageviews,
            "unique_sessions": row.unique_sessions,
        }
        for row in novel_stats
    ]

    daily_rows = (
        db.query(
            func.date(PageView.viewed_at).label("date"),
            func.count(PageView.id).label("pageviews"),
        )
        .filter(PageView.viewed_at >= since)
        .group_by(func.date(PageView.viewed_at))
        .order_by(func.date(PageView.viewed_at))
        .all()
    )

    daily_trend = [
        {"date": str(row.date), "pageviews": row.pageviews}
        for row in daily_rows
    ]

    return {
        "period_days": days,
        "total_pageviews": total_pv,
        "novels": novels_data,
        "daily_trend": daily_trend,
    }
