from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session
from dependencies import get_db, get_session_id
from schemas.analytics import BookmarkRequest, BookmarkResponse
from services import bookmark_service

router = APIRouter()


@router.get("/bookmarks", response_model=None)
def list_bookmarks(
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
):
    return bookmark_service.get_bookmarks(db, session_id)


@router.post("/bookmarks", status_code=201, response_model=None)
def create_bookmark(
    body: BookmarkRequest,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
):
    return bookmark_service.upsert_bookmark(
        db, session_id, body.novel_slug, body.chapter_number
    )


@router.delete("/bookmarks/{novel_slug}", response_model=None)
def delete_bookmark(
    novel_slug: str = Path(...),
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
):
    return bookmark_service.delete_bookmark(db, session_id, novel_slug)
