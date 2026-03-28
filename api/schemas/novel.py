from pydantic import BaseModel, field_validator
from typing import Optional
import re

SLUG_PATTERN = re.compile(r"^[a-z0-9\-]+$")
VALID_GENRES = {"sf", "fantasy", "mystery", "slice-of-life", "horror", "romance"}
VALID_SORTS  = {"updated_at_desc", "rating_desc", "title_asc"}


class CharacterSchema(BaseModel):
    name: str
    role: str
    description: Optional[str] = None


class IllustrationResponse(BaseModel):
    id: int
    image_path: str
    alt_text: Optional[str]
    position: int

    class Config:
        from_attributes = True


class ChapterSummary(BaseModel):
    id: int
    number: int
    title: str
    published_at: str

    class Config:
        from_attributes = True


class NovelResponse(BaseModel):
    id: int
    slug: str
    title: str
    author: str
    genre: str
    tags: list[str]
    synopsis: str
    characters: list[CharacterSchema]
    cover_image: Optional[str]
    rating: float
    total_chapters: int
    latest_chapter: int
    update_schedule: Optional[str]
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class NovelDetailResponse(NovelResponse):
    chapters: list[ChapterSummary]


class NovelListResponse(BaseModel):
    total: int
    items: list[NovelResponse]


class ChapterResponse(BaseModel):
    id: int
    novel_slug: str
    number: int
    title: str
    content: str
    illustrations: list[IllustrationResponse]
    published_at: str

    class Config:
        from_attributes = True


class NovelListParams(BaseModel):
    genre: Optional[str] = None
    sort: str = "updated_at_desc"
    limit: int = 20
    offset: int = 0

    @field_validator("genre")
    @classmethod
    def validate_genre(cls, v):
        if v is not None and v not in VALID_GENRES:
            raise ValueError(f"genre must be one of {VALID_GENRES}")
        return v

    @field_validator("sort")
    @classmethod
    def validate_sort(cls, v):
        if v not in VALID_SORTS:
            raise ValueError(f"sort must be one of {VALID_SORTS}")
        return v

    @field_validator("limit")
    @classmethod
    def validate_limit(cls, v):
        if not (1 <= v <= 50):
            raise ValueError("limit must be between 1 and 50")
        return v

    @field_validator("offset")
    @classmethod
    def validate_offset(cls, v):
        if v < 0:
            raise ValueError("offset must be >= 0")
        return v


class GenerateChapterRequest(BaseModel):
    novel_slug: str
    chapter_number: Optional[int] = None

    @field_validator("novel_slug")
    @classmethod
    def validate_slug(cls, v):
        if not SLUG_PATTERN.match(v):
            raise ValueError("novel_slug must match ^[a-z0-9\\-]+$")
        return v

    @field_validator("chapter_number")
    @classmethod
    def validate_chapter_number(cls, v):
        if v is not None and v < 1:
            raise ValueError("chapter_number must be >= 1")
        return v


class SearchResultItem(BaseModel):
    slug: str
    title: str
    genre: str
    synopsis: str
    cover_image: Optional[str]
    rating: float
    match_type: str


class SearchResponse(BaseModel):
    total: int
    items: list[SearchResultItem]
