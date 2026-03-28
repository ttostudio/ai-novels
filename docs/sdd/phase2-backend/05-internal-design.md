---
issue: "ttostudio/ttoClaw#25"
version: "1.0"
author-role: System Engineer
gate: Gate-2
status: draft
---

# 内部設計書 — Phase 2: バックエンド構築・DB移行・API化

## 1. FastAPI プロジェクト構造

```
api/
├── Dockerfile
├── requirements.txt
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 0001_initial_schema.py
├── main.py                  # FastAPI アプリ初期化、ルーター登録
├── database.py              # SQLAlchemy エンジン・セッション管理
├── models/
│   ├── __init__.py
│   ├── novel.py             # Novel, Chapter, Illustration モデル
│   └── analytics.py         # Bookmark, PageView, ReadingProgress モデル
├── schemas/
│   ├── __init__.py
│   ├── novel.py             # Pydantic スキーマ（リクエスト/レスポンス）
│   └── analytics.py
├── routers/
│   ├── __init__.py
│   ├── novels.py            # /api/novels/* エンドポイント
│   ├── bookmarks.py         # /api/bookmarks エンドポイント
│   ├── analytics.py         # /api/analytics/* エンドポイント
│   └── generate.py          # /api/generate/chapter エンドポイント
├── services/
│   ├── __init__.py
│   ├── novel_service.py     # 小説 CRUD ロジック
│   ├── search_service.py    # 全文検索ロジック（pg_trgm）
│   ├── bookmark_service.py  # ブックマーク CRUD ロジック
│   ├── analytics_service.py # PV 記録・集計ロジック
│   └── generate_service.py  # 章生成ロジック（Claude API 呼び出し）
├── dependencies.py          # 共通依存性注入（DBセッション、session_id 検証）
└── scripts/
    └── seed_from_json.py    # JSON → DB マイグレーションスクリプト
```

### 1.1 Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 1.2 requirements.txt

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.36
psycopg2-binary==2.9.9
alembic==1.14.0
pydantic==2.9.0
python-multipart==0.0.12
anthropic==0.40.0
```

---

## 2. データベース接続設計

### 2.1 database.py

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
```

### 2.2 dependencies.py（DBセッション・session_id 依存性注入）

```python
from fastapi import Header, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import uuid

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_session_id(x_session_id: str = Header(...)) -> str:
    try:
        uuid.UUID(x_session_id, version=4)
        return x_session_id
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid X-Session-ID: must be UUID v4")
```

---

## 3. SQLAlchemy モデル

### 3.1 models/novel.py

```python
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, ARRAY,
    TIMESTAMP, ForeignKey, CheckConstraint, UniqueConstraint
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
```

### 3.2 models/analytics.py

```python
from sqlalchemy import (
    Column, Integer, BigInteger, String, TIMESTAMP,
    ForeignKey, CheckConstraint, UniqueConstraint
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
        UniqueConstraint("session_id", "novel_slug", name="uq_reading_progress_session_novel"),
        CheckConstraint("progress_percent >= 0 AND progress_percent <= 100",
                        name="ck_reading_progress_percent"),
    )
```

---

## 4. Pydantic スキーマ

### 4.1 schemas/novel.py

```python
from pydantic import BaseModel, field_validator, model_validator
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
```

---

## 5. Alembic マイグレーション

### 5.1 alembic.ini（抜粋）

```ini
[alembic]
script_location = alembic
sqlalchemy.url = %(DATABASE_URL)s
```

### 5.2 alembic/env.py（抜粋）

```python
import os
from sqlalchemy import engine_from_config, pool
from alembic import context
from database import Base
import models.novel
import models.analytics

config = context.config
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

target_metadata = Base.metadata
```

### 5.3 alembic/versions/0001_initial_schema.py

初期スキーマ（04-external-design.md § 2 の DDL を適用）。

```python
"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # pg_trgm 拡張
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # novels テーブル（DDL は 04-external-design.md § 2.2 と同一）
    op.create_table("novels", ...)

    # chapters, illustrations, bookmarks, pageviews, reading_progress テーブル
    # （DDL は 04-external-design.md § 2.3〜2.7 と同一）
    ...

    # インデックス
    op.create_index("idx_novels_genre", "novels", ["genre"])
    op.create_index("idx_novels_slug",  "novels", ["slug"])
    op.create_index("idx_novels_title_trgm", "novels", ["title"],
                    postgresql_using="gin",
                    postgresql_ops={"title": "gin_trgm_ops"})
    op.create_index("idx_novels_synopsis_trgm", "novels", ["synopsis"],
                    postgresql_using="gin",
                    postgresql_ops={"synopsis": "gin_trgm_ops"})
    op.create_index("idx_chapters_content_trgm", "chapters", ["content"],
                    postgresql_using="gin",
                    postgresql_ops={"content": "gin_trgm_ops"})

def downgrade():
    op.drop_table("reading_progress")
    op.drop_table("pageviews")
    op.drop_table("bookmarks")
    op.drop_table("illustrations")
    op.drop_table("chapters")
    op.drop_table("novels")
```

---

## 6. フロントエンド lib/api.ts 設計

既存の `lib/data.ts`（JSON 直接インポート）を `lib/api.ts`（API fetch）に差し替える。

### 6.1 lib/api.ts 構造

```typescript
// lib/api.ts — バックエンド API クライアント
// 既存 lib/data.ts と同一インターフェースを提供し、呼び出し側を変更不要にする

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

// session_id をブラウザのローカルストレージで管理
function getSessionId(): string {
  if (typeof window === "undefined") return "ssr-session";
  let id = localStorage.getItem("session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("session_id", id);
  }
  return id;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": getSessionId(),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API Error");
  }
  return res.json();
}

// ---- 小説一覧 ----
export async function getNovels(params?: {
  genre?: string;
  sort?: string;
}): Promise<NovelListResponse> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch(`/novels${qs ? "?" + qs : ""}`);
}

// ---- 小説詳細 ----
export async function getNovel(slug: string): Promise<NovelDetailResponse> {
  return apiFetch(`/novels/${slug}`);
}

// ---- 章本文 ----
export async function getChapter(
  slug: string,
  number: number
): Promise<ChapterResponse> {
  return apiFetch(`/novels/${slug}/chapters/${number}`);
}

// ---- 全文検索 ----
export async function searchNovels(q: string): Promise<SearchResponse> {
  return apiFetch(`/novels/search?q=${encodeURIComponent(q)}`);
}

// ---- ブックマーク ----
export async function getBookmarks(): Promise<BookmarkResponse[]> {
  return apiFetch("/bookmarks");
}

export async function upsertBookmark(
  novel_slug: string,
  chapter_number: number
): Promise<BookmarkResponse> {
  return apiFetch("/bookmarks", {
    method: "POST",
    body: JSON.stringify({ novel_slug, chapter_number }),
  });
}

export async function deleteBookmark(novel_slug: string): Promise<void> {
  await apiFetch(`/bookmarks/${novel_slug}`, { method: "DELETE" });
}

// ---- PV 記録 ----
export async function recordPageView(
  novel_slug: string,
  chapter_number?: number
): Promise<void> {
  await apiFetch("/analytics/pageview", {
    method: "POST",
    body: JSON.stringify({ novel_slug, chapter_number, session_id: getSessionId() }),
  });
}
```

### 6.2 既存 lib/data.ts との差し替え方針

1. `lib/api.ts` を新規作成
2. 既存ページ（`pages/index.tsx`, `pages/novels/[slug].tsx`, `pages/novels/[slug]/chapters/[number].tsx` 等）の import を `lib/data` → `lib/api` に変更
3. SSG（`getStaticProps`）の呼び出しを `getServerSideProps` または Client-side fetch に変更（SSG では build 時に API サーバーが不要なため）
4. `NEXT_PUBLIC_API_BASE_URL` 環境変数を `.env.local` に追加
5. 既存 JSON ファイルはフォールバック用に残存（削除は Phase 3）

---

## 7. シーケンス図

### 7.1 GET /api/novels/{slug}/chapters/{number}

```
クライアント          Caddy           FastAPI            PostgreSQL
    │                  │                 │                    │
    │─GET /api/novels/stellar-drift/chapters/1──────────────►│
    │                  │                 │                    │
    │                  │─route to api:8000─►│                 │
    │                  │                 │                    │
    │                  │                 │─SELECT chapters WHERE
    │                  │                 │  novel_slug=? AND number=?──►│
    │                  │                 │                    │
    │                  │                 │◄──── ChapterRow ───│
    │                  │                 │                    │
    │                  │                 │─SELECT illustrations WHERE
    │                  │                 │  chapter_id=? ─────────────►│
    │                  │                 │                    │
    │                  │                 │◄── IllustrationRows ─────────│
    │                  │                 │                    │
    │◄──── 200 JSON ───────────────────│                    │
```

### 7.2 POST /api/bookmarks（upsert）

```
クライアント          Caddy           FastAPI            PostgreSQL
    │                  │                 │                    │
    │─POST /api/bookmarks (X-Session-ID: xxx)────────────────►│
    │                  │                 │                    │
    │                  │─route to api────►│                   │
    │                  │                 │─validate session_id│
    │                  │                 │─validate novel_slug│
    │                  │                 │                    │
    │                  │                 │─INSERT bookmarks ON CONFLICT
    │                  │                 │  (session_id, novel_slug)
    │                  │                 │  DO UPDATE ───────►│
    │                  │                 │                    │
    │                  │                 │◄── BookmarkRow ────│
    │                  │                 │                    │
    │◄──── 201 JSON ───────────────────│                    │
```

### 7.3 POST /api/generate/chapter

```
クライアント          FastAPI           PostgreSQL        Claude API
    │                  │                 │                    │
    │─POST /api/generate/chapter─────────►│                  │
    │                  │                 │                    │
    │                  │─SELECT novels WHERE slug=? ─────────►│
    │                  │                 │                    │
    │                  │◄── Novel ───────│                    │
    │                  │                 │                    │
    │                  │─SELECT MAX(number) FROM chapters──►  │
    │                  │◄── next_number ─│                    │
    │                  │                 │                    │
    │◄──── 202 Accepted ─────────────── │                    │
    │                  │                 │                    │
    │     (非同期 BackgroundTask)        │                    │
    │                  │─── generate_chapter(prompt) ─────────►
    │                  │◄── content ────────────────────────── │
    │                  │                 │                    │
    │                  │─INSERT chapters ────────────────────►│
    │                  │─INSERT illustrations ───────────────►│
    │                  │─UPDATE novels (total_chapters) ─────►│
```

### 7.4 JSON → DB シード（初回起動時）

```
migrate サービス      Alembic          PostgreSQL
    │                  │                 │
    │─alembic upgrade head ─────────────►│
    │                  │─CREATE TABLE novels ──────────────►│
    │                  │─CREATE TABLE chapters ─────────────►│
    │                  │─(他テーブル) ──────────────────────►│
    │◄─── complete ─────────────────────│                   │
    │                  │                                     │
    │─python seed_from_json.py ──────────────────────────────►
    │ (novels.json → INSERT novels)                          │
    │ (chapters/*.json → INSERT chapters, illustrations) ───►│
    │◄── seeded (3 novels, 13 chapters) ─────────────────────│
```

---

## 8. seed_from_json.py 内部設計

```
api/scripts/seed_from_json.py

関数構成:
  main()
    ├── load_novels()       → novels.json を読み込み
    ├── upsert_novel()      → INSERT ... ON CONFLICT (slug) DO UPDATE
    ├── load_chapters()     → chapters/{slug}.json を読み込み
    ├── upsert_chapter()    → INSERT ... ON CONFLICT (novel_slug, number) DO UPDATE
    ├── upsert_illustration() → chapter.id で紐付け
    └── update_novel_counts() → total_chapters / latest_chapter を集計で更新

フィールドマッピング:
  JSON.coverImage   → DB.cover_image
  JSON.totalChapters → DB.total_chapters （seed後に集計値で上書き）
  JSON.illustrations[].url       → DB.image_path
  JSON.illustrations[].caption   → DB.alt_text
  JSON.illustrations[].insertAfterParagraph → DB.position

エラーハンドリング:
  - 各 upsert はトランザクション単位で実行
  - 失敗時はロールバックして例外をログ出力
  - 全体の完了後に件数サマリーを出力
```

---

## 9. テスタビリティ設計

### 9.1 テスト分離方針

- ユニットテスト: `services/` の各関数をモックDB付きでテスト
- 統合テスト: `docker compose run --rm migrate` でテスト用 DB を起動し、実 DB に対して API テスト実行
- E2E テスト: Playwright で既存フロントエンド画面の回帰テスト（NFR-004 対応）

### 9.2 テスト容易化のための設計

- `get_db()` 依存性注入により、テスト時に DB セッションをオーバーライド可能
- `services/` レイヤーは DB セッションを引数で受け取る（DI 可能）
- 環境変数 `DATABASE_URL` を切り替えることでテスト DB に接続可能

### 9.3 並行性テストケース

| シナリオ | テスト内容 |
|---------|----------|
| 同一 session_id で同時ブックマーク保存 | UPSERT の unique constraint でデータ競合が起きないことを確認 |
| 複数 session_id からの同時 PV 記録 | BIGSERIAL の採番が重複しないことを確認 |
| 章生成中に同一章番号で再リクエスト | `chapters.uq_chapters_novel_number` で重複 INSERT が防がれることを確認 |

---

## 10. 変更影響範囲

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `docker-compose.yml` | 追加 | postgres / api / migrate サービス追加 |
| `caddy/Caddyfile` | 変更 | `/api/*` ルーティング追加 |
| `frontend/lib/api.ts` | 新規 | API クライアント（lib/data.ts 置換） |
| `frontend/.env.local` | 新規 | `NEXT_PUBLIC_API_BASE_URL` |
| `frontend/pages/**/*.tsx` | 変更 | import 先を lib/data → lib/api に変更 |
| `api/` | 新規 | FastAPI アプリ一式 |

### ロールバック手順

```bash
# フロントエンドを JSON 読み込みモードに戻す
# frontend/.env.local の NEXT_PUBLIC_API_BASE_URL をコメントアウト
# frontend/pages の import を lib/data に戻す（git revert 対応）
docker compose restart frontend
```
