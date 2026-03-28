from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from models.novel import Novel, Chapter
from fastapi import HTTPException


def search_novels(db: Session, q: str, limit: int = 20, offset: int = 0) -> dict:
    if not q or len(q) > 100:
        raise HTTPException(status_code=422, detail="q must be between 1 and 100 characters")

    title_matches = (
        db.query(Novel, func.similarity(Novel.title, q).label("score"))
        .filter(Novel.title.op("%")(q))
        .all()
    )
    synopsis_matches = (
        db.query(Novel, func.similarity(Novel.synopsis, q).label("score"))
        .filter(Novel.synopsis.op("%")(q))
        .all()
    )

    seen_slugs = set()
    results = []

    for novel, score in title_matches:
        if novel.slug not in seen_slugs:
            seen_slugs.add(novel.slug)
            results.append({
                "slug": novel.slug,
                "title": novel.title,
                "genre": novel.genre,
                "synopsis": novel.synopsis,
                "cover_image": novel.cover_image,
                "rating": float(novel.rating),
                "match_type": "title",
            })

    for novel, score in synopsis_matches:
        if novel.slug not in seen_slugs:
            seen_slugs.add(novel.slug)
            results.append({
                "slug": novel.slug,
                "title": novel.title,
                "genre": novel.genre,
                "synopsis": novel.synopsis,
                "cover_image": novel.cover_image,
                "rating": float(novel.rating),
                "match_type": "synopsis",
            })

    total = len(results)
    paged = results[offset: offset + limit]

    return {"total": total, "items": paged}
