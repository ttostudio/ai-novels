"""
JSON → DB シードスクリプト
frontend/data/novels.json + frontend/data/chapters/*.json を PostgreSQL に投入する。
冪等（UPSERT）なので何度実行しても安全。
"""
import json
import os
import sys
from pathlib import Path

# api/ ディレクトリをパスに追加
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from database import SessionLocal, engine
from models.novel import Novel, Chapter, Illustration

DATA_DIR = Path(__file__).parent.parent.parent / "frontend" / "data"


def load_novels() -> list[dict]:
    with open(DATA_DIR / "novels.json", encoding="utf-8") as f:
        return json.load(f)


def load_chapters(slug: str) -> list[dict]:
    path = DATA_DIR / "chapters" / f"{slug}.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def upsert_novel(db, data: dict) -> None:
    existing = db.query(Novel).filter(Novel.slug == data["slug"]).first()
    if existing:
        existing.title           = data["title"]
        existing.author          = data.get("author", "AI")
        existing.genre           = data["genre"]
        existing.tags            = data.get("tags", [])
        existing.synopsis        = data["synopsis"]
        existing.characters      = data.get("characters", [])
        existing.cover_image     = data.get("coverImage")
        existing.rating          = data.get("rating", 0.0)
        existing.update_schedule = data.get("updateSchedule")
        existing.status          = data.get("status", "active")
    else:
        novel = Novel(
            slug            = data["slug"],
            title           = data["title"],
            author          = data.get("author", "AI"),
            genre           = data["genre"],
            tags            = data.get("tags", []),
            synopsis        = data["synopsis"],
            characters      = data.get("characters", []),
            cover_image     = data.get("coverImage"),
            rating          = data.get("rating", 0.0),
            total_chapters  = 0,
            latest_chapter  = 0,
            update_schedule = data.get("updateSchedule"),
            status          = data.get("status", "active"),
        )
        db.add(novel)


def upsert_chapter(db, data: dict) -> Chapter:
    existing = (
        db.query(Chapter)
        .filter(Chapter.novel_slug == data["novelSlug"], Chapter.number == data["number"])
        .first()
    )
    if existing:
        existing.title   = data["title"]
        existing.content = data["content"]
        db.flush()
        return existing
    else:
        chapter = Chapter(
            novel_slug   = data["novelSlug"],
            number       = data["number"],
            title        = data["title"],
            content      = data["content"],
        )
        db.add(chapter)
        db.flush()
        return chapter


def upsert_illustrations(db, chapter: Chapter, illustrations: list[dict]) -> None:
    # 既存の挿絵を全削除して再 INSERT（シード時のシンプルな戦略）
    for ill in list(chapter.illustrations):
        db.delete(ill)
    db.flush()

    for ill_data in illustrations:
        ill = Illustration(
            chapter_id = chapter.id,
            image_path = ill_data.get("url", ""),
            alt_text   = ill_data.get("caption"),
            position   = ill_data.get("insertAfterParagraph", 2),
        )
        db.add(ill)


def update_novel_counts(db, slug: str) -> None:
    chapters = db.query(Chapter).filter(Chapter.novel_slug == slug).all()
    if not chapters:
        return
    total  = len(chapters)
    latest = max(ch.number for ch in chapters)
    novel = db.query(Novel).filter(Novel.slug == slug).first()
    if novel:
        novel.total_chapters = total
        novel.latest_chapter = latest


def main() -> None:
    print("=== JSON → DB シード開始 ===")
    novels_data = load_novels()
    novel_count   = 0
    chapter_count = 0
    illust_count  = 0

    db = SessionLocal()
    try:
        for novel_data in novels_data:
            slug = novel_data["slug"]
            upsert_novel(db, novel_data)
            db.flush()
            novel_count += 1

            chapters_data = load_chapters(slug)
            for ch_data in chapters_data:
                chapter = upsert_chapter(db, ch_data)
                chapter_count += 1

                illustrations = ch_data.get("illustrations", [])
                upsert_illustrations(db, chapter, illustrations)
                illust_count += len(illustrations)

            update_novel_counts(db, slug)

        db.commit()
        print(f"完了: novels={novel_count}, chapters={chapter_count}, illustrations={illust_count}")
    except Exception as e:
        db.rollback()
        print(f"エラー: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
