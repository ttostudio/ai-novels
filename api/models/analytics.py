from sqlalchemy import (
    Column, Integer, BigInteger, String, TIMESTAMP,
    ForeignKey, CheckConstraint, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id             = Column(Integer, primary_key=True)
    session_id     = Column(String(100), nullable=False)
    novel_slug     = Column(String(100), ForeignKey("novels.slug", ondelete="CASCADE"),
                            nullable=False)
    chapter_number = Column(Integer, nullable=False)
    created_at     = Column(TIMESTAMP(timezone=True), nullable=False,
                            default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("session_id", "novel_slug", name="uq_bookmarks_session_novel"),
    )


class PageView(Base):
    __tablename__ = "pageviews"

    id             = Column(BigInteger, primary_key=True)
    novel_slug     = Column(String(100), nullable=False)
    chapter_number = Column(Integer)
    session_id     = Column(String(100))
    viewed_at      = Column(TIMESTAMP(timezone=True), nullable=False,
                            default=datetime.datetime.utcnow)


class ReadingProgress(Base):
    __tablename__ = "reading_progress"

    id               = Column(Integer, primary_key=True)
    session_id       = Column(String(100), nullable=False)
    novel_slug       = Column(String(100), ForeignKey("novels.slug", ondelete="CASCADE"),
                              nullable=False)
    chapter_number   = Column(Integer, nullable=False)
    progress_percent = Column(Integer, nullable=False, default=0)
    updated_at       = Column(TIMESTAMP(timezone=True), nullable=False,
                              default=datetime.datetime.utcnow,
                              onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("session_id", "novel_slug",
                         name="uq_reading_progress_session_novel"),
        CheckConstraint("progress_percent >= 0 AND progress_percent <= 100",
                        name="ck_reading_progress_percent"),
    )
