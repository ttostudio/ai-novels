from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from models.novel import Novel, Chapter, Illustration
from schemas.novel import NovelListParams
from fastapi import HTTPException
import re

SLUG_PATTERN = re.compile(r"^[a-z0-9\-]+$")


def _novel_to_dict(novel: Novel) -> dict:
    return {
        "id": novel.id,
        "slug": novel.slug,
        "title": novel.title,
        "author": novel.author,
        "genre": novel.genre,
        "tags": novel.tags or [],
        "synopsis": novel.synopsis,
        "characters": novel.characters or [],
        "cover_image": novel.cover_image,
        "rating": float(novel.rating),
        "total_chapters": novel.total_chapters,
        "latest_chapter": novel.latest_chapter,
        "update_schedule": novel.update_schedule,
        "status": novel.status,
        "created_at": novel.created_at.isoformat() if novel.created_at else None,
        "updated_at": novel.updated_at.isoformat() if novel.updated_at else None,
    }


def get_novels(db: Session, params: NovelListParams) -> dict:
    query = db.query(Novel)

    if params.genre:
        query = query.filter(Novel.genre == params.genre)

    if params.sort == "updated_at_desc":
        query = query.order_by(Novel.updated_at.desc())
    elif params.sort == "rating_desc":
        query = query.order_by(Novel.rating.desc())
    elif params.sort == "title_asc":
        query = query.order_by(Novel.title.asc())

    total = query.count()
    novels = query.offset(params.offset).limit(params.limit).all()

    return {
        "total": total,
        "items": [_novel_to_dict(n) for n in novels],
    }


def get_novel(db: Session, slug: str) -> dict:
    if not SLUG_PATTERN.match(slug):
        raise HTTPException(status_code=400, detail="Invalid slug format")

    novel = db.query(Novel).filter(Novel.slug == slug).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = _novel_to_dict(novel)
    result["chapters"] = [
        {
            "id": ch.id,
            "number": ch.number,
            "title": ch.title,
            "published_at": ch.published_at.isoformat() if ch.published_at else None,
        }
        for ch in novel.chapters
    ]
    return result


def get_chapter(db: Session, slug: str, number: int) -> dict:
    if not SLUG_PATTERN.match(slug):
        raise HTTPException(status_code=400, detail="Invalid slug format")
    if number < 1:
        raise HTTPException(status_code=400, detail="chapter number must be >= 1")

    chapter = (
        db.query(Chapter)
        .filter(Chapter.novel_slug == slug, Chapter.number == number)
        .first()
    )
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return {
        "id": chapter.id,
        "novel_slug": chapter.novel_slug,
        "number": chapter.number,
        "title": chapter.title,
        "content": chapter.content,
        "illustrations": [
            {
                "id": ill.id,
                "image_path": ill.image_path,
                "alt_text": ill.alt_text,
                "position": ill.position,
            }
            for ill in chapter.illustrations
        ],
        "published_at": chapter.published_at.isoformat() if chapter.published_at else None,
    }
