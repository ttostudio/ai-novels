from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies import get_db
from schemas.novel import GenerateChapterRequest
from services import generate_service

router = APIRouter()


@router.post("/generate/chapter", status_code=202, response_model=None)
def generate_chapter(
    body: GenerateChapterRequest,
    db: Session = Depends(get_db),
):
    return generate_service.trigger_chapter_generation(
        db, body.novel_slug, body.chapter_number
    )
