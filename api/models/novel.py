from sqlalchemy import (
    Column, Integer, String, Text, Numeric, ARRAY,
    TIMESTAMP, ForeignKey, CheckConstraint, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Novel(Base):
    __tablename__ = "novels"

    id              = Column(Integer, primary_key=True)
    slug            = Column(String(100), nullable=False, unique=True)
    title           = Column(String(500), nullable=False)
    author          = Column(String(200), nullable=False, default="AI")
    genre           = Column(String(50), nullable=False)
    tags            = Column(ARRAY(Text), nullable=False, default=[])
    synopsis        = Column(Text, nullable=False)
    characters      = Column(JSONB, nullable=False, default=[])
    cover_image     = Column(String(500))
    rating          = Column(Numeric(3, 1), nullable=False, default=0.0)
    total_chapters  = Column(Integer, nullable=False, default=0)
    latest_chapter  = Column(Integer, nullable=False, default=0)
    update_schedule = Column(String(100))
    status          = Column(String(20), nullable=False, default="active")
    created_at      = Column(TIMESTAMP(timezone=True), nullable=False,
                             default=datetime.datetime.utcnow)
    updated_at      = Column(TIMESTAMP(timezone=True), nullable=False,
                             default=datetime.datetime.utcnow,
                             onupdate=datetime.datetime.utcnow)

    chapters = relationship("Chapter", back_populates="novel",
                            order_by="Chapter.number")

    __table_args__ = (
        CheckConstraint("status IN ('active', 'paused', 'completed')",
                        name="ck_novels_status"),
        CheckConstraint("rating >= 0.0 AND rating <= 5.0",
                        name="ck_novels_rating"),
    )


class Chapter(Base):
    __tablename__ = "chapters"

    id           = Column(Integer, primary_key=True)
    novel_slug   = Column(String(100), ForeignKey("novels.slug", ondelete="CASCADE"),
                          nullable=False)
    number       = Column(Integer, nullable=False)
    title        = Column(String(500), nullable=False)
    content      = Column(Text, nullable=False)
    published_at = Column(TIMESTAMP(timezone=True), nullable=False,
                          default=datetime.datetime.utcnow)
    created_at   = Column(TIMESTAMP(timezone=True), nullable=False,
                          default=datetime.datetime.utcnow)

    novel         = relationship("Novel", back_populates="chapters")
    illustrations = relationship("Illustration", back_populates="chapter",
                                 cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("novel_slug", "number", name="uq_chapters_novel_number"),
    )


class Illustration(Base):
    __tablename__ = "illustrations"

    id         = Column(Integer, primary_key=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"),
                        nullable=False)
    image_path = Column(String(500), nullable=False)
    alt_text   = Column(String(500))
    position   = Column(Integer, nullable=False, default=2)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False,
                        default=datetime.datetime.utcnow)

    chapter = relationship("Chapter", back_populates="illustrations")
