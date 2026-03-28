from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from dependencies import get_db
from schemas.novel import NovelListParams, NovelListResponse, NovelDetailResponse, ChapterResponse, SearchResponse
from services import novel_service, search_service
from typing import Optional

router = APIRouter()


@router.get("/novels", response_model=None)
def list_novels(
    genre: Optional[str] = Query(default=None),
    sort: str = Query(default="updated_at_desc"),
    limit: int = Query(default=20),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    params = NovelListParams(genre=genre, sort=sort, limit=limit, offset=offset)
    return novel_service.get_novels(db, params)


@router.get("/novels/search", response_model=None)
def search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return search_service.search_novels(db, q, limit, offset)


@router.get("/novels/{slug}", response_model=None)
def get_novel(
    slug: str = Path(...),
    db: Session = Depends(get_db),
):
    return novel_service.get_novel(db, slug)


@router.get("/novels/{slug}/chapters/{number}", response_model=None)
def get_chapter(
    slug: str = Path(...),
    number: int = Path(..., ge=1),
    db: Session = Depends(get_db),
):
    return novel_service.get_chapter(db, slug, number)
