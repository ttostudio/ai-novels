from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from dependencies import get_db
from schemas.analytics import PageViewRequest
from services import analytics_service

router = APIRouter()


@router.post("/analytics/pageview", status_code=201, response_model=None)
def record_pageview(
    body: PageViewRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    background_tasks.add_task(
        analytics_service.record_pageview,
        db,
        body.novel_slug,
        body.chapter_number,
        body.session_id,
    )
    return {"recorded": True}


@router.get("/analytics/dashboard", response_model=None)
def dashboard(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.get_dashboard(db, days)
