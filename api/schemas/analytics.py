from pydantic import BaseModel, field_validator
from typing import Optional
import re

SLUG_PATTERN = re.compile(r"^[a-z0-9\-]+$")


class BookmarkRequest(BaseModel):
    novel_slug: str
    chapter_number: int

    @field_validator("novel_slug")
    @classmethod
    def validate_slug(cls, v):
        if not SLUG_PATTERN.match(v) or len(v) > 100:
            raise ValueError("novel_slug must match ^[a-z0-9\\-]+$ and be <= 100 chars")
        return v

    @field_validator("chapter_number")
    @classmethod
    def validate_chapter_number(cls, v):
        if v < 1:
            raise ValueError("chapter_number must be >= 1")
        return v


class BookmarkResponse(BaseModel):
    id: int
    session_id: str
    novel_slug: str
    chapter_number: int
    created_at: str

    class Config:
        from_attributes = True


class PageViewRequest(BaseModel):
    novel_slug: str
    chapter_number: Optional[int] = None
    session_id: Optional[str] = None

    @field_validator("novel_slug")
    @classmethod
    def validate_slug(cls, v):
        if not SLUG_PATTERN.match(v) or len(v) > 100:
            raise ValueError("novel_slug must match ^[a-z0-9\\-]+$")
        return v

    @field_validator("chapter_number")
    @classmethod
    def validate_chapter_number(cls, v):
        if v is not None and v < 1:
            raise ValueError("chapter_number must be >= 1")
        return v


class PageViewResponse(BaseModel):
    recorded: bool


class NovelStats(BaseModel):
    slug: str
    title: str
    pageviews: int
    unique_sessions: int


class DailyTrend(BaseModel):
    date: str
    pageviews: int


class DashboardResponse(BaseModel):
    period_days: int
    total_pageviews: int
    novels: list[NovelStats]
    daily_trend: list[DailyTrend]
