from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from models.analytics import Bookmark
from models.novel import Novel
from fastapi import HTTPException
import re

SLUG_PATTERN = re.compile(r"^[a-z0-9\-]+$")


def _bookmark_to_dict(bm: Bookmark) -> dict:
    return {
        "id": bm.id,
        "session_id": bm.session_id,
        "novel_slug": bm.novel_slug,
        "chapter_number": bm.chapter_number,
        "created_at": bm.created_at.isoformat() if bm.created_at else None,
    }


def get_bookmarks(db: Session, session_id: str) -> list:
    bookmarks = db.query(Bookmark).filter(Bookmark.session_id == session_id).all()
    return [_bookmark_to_dict(bm) for bm in bookmarks]


def upsert_bookmark(db: Session, session_id: str, novel_slug: str, chapter_number: int) -> dict:
    novel = db.query(Novel).filter(Novel.slug == novel_slug).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    stmt = (
        insert(Bookmark)
        .values(session_id=session_id, novel_slug=novel_slug, chapter_number=chapter_number)
        .on_conflict_do_update(
            constraint="uq_bookmarks_session_novel",
            set_={"chapter_number": chapter_number},
        )
        .returning(Bookmark)
    )
    result = db.execute(stmt)
    db.commit()
    row = result.fetchone()

    bm = db.query(Bookmark).filter(
        Bookmark.session_id == session_id,
        Bookmark.novel_slug == novel_slug,
    ).first()
    return _bookmark_to_dict(bm)


def delete_bookmark(db: Session, session_id: str, novel_slug: str) -> dict:
    bm = db.query(Bookmark).filter(
        Bookmark.session_id == session_id,
        Bookmark.novel_slug == novel_slug,
    ).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bm)
    db.commit()
    return {"deleted": True}
