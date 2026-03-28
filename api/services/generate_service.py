from sqlalchemy.orm import Session
from models.novel import Novel, Chapter
from fastapi import HTTPException
import os


def trigger_chapter_generation(
    db: Session,
    novel_slug: str,
    chapter_number: int | None,
) -> dict:
    novel = db.query(Novel).filter(Novel.slug == novel_slug).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    if chapter_number is None:
        max_number = (
            db.query(Chapter.number)
            .filter(Chapter.novel_slug == novel_slug)
            .order_by(Chapter.number.desc())
            .first()
        )
        chapter_number = (max_number[0] + 1) if max_number else 1

    return {
        "status": "accepted",
        "novel_slug": novel_slug,
        "chapter_number": chapter_number,
    }
