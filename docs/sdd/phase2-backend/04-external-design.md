---
issue: "ttostudio/ttoClaw#25"
version: "1.0"
author-role: System Engineer
gate: Gate-2
status: draft
---

# 外部設計書 — Phase 2: バックエンド構築・DB移行・API化

## 1. システム構成

### 1.1 アーキテクチャ概要

```
クライアント
    │ HTTP
    ▼
Caddy (port 3600)
    ├── /api/* → FastAPI (api:8000)
    └── /*     → Next.js (frontend:3000)
                      │
                 PostgreSQL (postgres:5432)
```

### 1.2 Docker Compose サービス構成

| サービス | イメージ | ポート | 役割 |
|---------|---------|--------|------|
| frontend | ./frontend | expose:3000 | Next.js SSG |
| api | ./api | expose:8000 | FastAPI バックエンド |
| postgres | postgres:16-alpine | 5434:5432 (host) | PostgreSQL DB |
| migrate | ./api | 起動時のみ | Alembic マイグレーション実行 |
| caddy | caddy:2-alpine | 3600:3600 | リバースプロキシ |

#### docker-compose.yml 差分

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: novels
      POSTGRES_PASSWORD: novels_password
      POSTGRES_DB: novels
    ports:
      - "5434:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U novels"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512m
    restart: unless-stopped

  migrate:
    build:
      context: ./api
      dockerfile: Dockerfile
    command: alembic upgrade head
    environment:
      DATABASE_URL: postgresql://novels:novels_password@postgres:5432/novels
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    environment:
      DATABASE_URL: postgresql://novels:novels_password@postgres:5432/novels
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      COMFYUI_URL: ${COMFYUI_URL:-http://localhost:8188}
    expose:
      - "8000"
    depends_on:
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    restart: unless-stopped

  frontend:
    # 既存設定に環境変数追加
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_BASE_URL=http://ai-novels:3600
      - NEXT_PUBLIC_API_BASE_URL=http://ai-novels:3600/api

volumes:
  postgres_data:
```

#### Caddyfile 差分

```
:3600 {
  # API ルーティング（追加）
  handle /api/* {
    reverse_proxy api:8000
  }

  # フロントエンド（既存）
  handle {
    reverse_proxy frontend:3000
  }

  header {
    X-Content-Type-Options nosniff
    X-Frame-Options SAMEORIGIN
  }

  log {
    output stdout
    format json
  }
}
```

---

## 2. データベーススキーマ（PostgreSQL）

### 2.1 テーブル一覧

| テーブル | 説明 |
|---------|------|
| novels | 小説メタデータ |
| chapters | 章本文 |
| illustrations | 挿絵 |
| bookmarks | ブックマーク（session_id ベース） |
| pageviews | ページビュー記録 |
| reading_progress | 読書進捗 |

### 2.2 novels テーブル

```sql
CREATE TABLE novels (
    id           SERIAL PRIMARY KEY,
    slug         VARCHAR(100) NOT NULL UNIQUE,
    title        VARCHAR(500) NOT NULL,
    author       VARCHAR(200) NOT NULL DEFAULT 'AI',
    genre        VARCHAR(50)  NOT NULL,
    tags         TEXT[]       NOT NULL DEFAULT '{}',
    synopsis     TEXT         NOT NULL,
    characters   JSONB        NOT NULL DEFAULT '[]',
    cover_image  VARCHAR(500),
    rating       NUMERIC(3,1) NOT NULL DEFAULT 0.0
                     CHECK (rating >= 0.0 AND rating <= 5.0),
    total_chapters   INTEGER  NOT NULL DEFAULT 0,
    latest_chapter   INTEGER  NOT NULL DEFAULT 0,
    update_schedule  VARCHAR(100),
    status       VARCHAR(20)  NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'completed')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_novels_genre   ON novels (genre);
CREATE INDEX idx_novels_status  ON novels (status);
CREATE INDEX idx_novels_slug    ON novels (slug);
-- 全文検索用
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_novels_title_trgm    ON novels USING GIN (title gin_trgm_ops);
CREATE INDEX idx_novels_synopsis_trgm ON novels USING GIN (synopsis gin_trgm_ops);
```

**characters JSONB 構造:**
```json
[
  {
    "name": "アキラ",
    "role": "船長、28歳",
    "description": "沈着冷静な若き船長。"
  }
]
```

### 2.3 chapters テーブル

```sql
CREATE TABLE chapters (
    id           SERIAL PRIMARY KEY,
    novel_slug   VARCHAR(100) NOT NULL REFERENCES novels(slug) ON DELETE CASCADE,
    number       INTEGER      NOT NULL,
    title        VARCHAR(500) NOT NULL,
    content      TEXT         NOT NULL,  -- Markdown 本文
    published_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (novel_slug, number)
);

CREATE INDEX idx_chapters_novel_slug ON chapters (novel_slug);
CREATE INDEX idx_chapters_number     ON chapters (novel_slug, number);
-- 全文検索用
CREATE INDEX idx_chapters_content_trgm ON chapters USING GIN (content gin_trgm_ops);
```

### 2.4 illustrations テーブル

```sql
CREATE TABLE illustrations (
    id           SERIAL PRIMARY KEY,
    chapter_id   INTEGER      NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    image_path   VARCHAR(500) NOT NULL,
    alt_text     VARCHAR(500),
    position     INTEGER      NOT NULL DEFAULT 2,  -- insertAfterParagraph
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_illustrations_chapter_id ON illustrations (chapter_id);
```

### 2.5 bookmarks テーブル

```sql
CREATE TABLE bookmarks (
    id             SERIAL PRIMARY KEY,
    session_id     VARCHAR(100) NOT NULL,
    novel_slug     VARCHAR(100) NOT NULL REFERENCES novels(slug) ON DELETE CASCADE,
    chapter_number INTEGER      NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, novel_slug)
);

CREATE INDEX idx_bookmarks_session_id ON bookmarks (session_id);
CREATE INDEX idx_bookmarks_novel_slug ON bookmarks (novel_slug);
```

### 2.6 pageviews テーブル

```sql
CREATE TABLE pageviews (
    id             BIGSERIAL    PRIMARY KEY,
    novel_slug     VARCHAR(100) NOT NULL,
    chapter_number INTEGER,
    session_id     VARCHAR(100),
    viewed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pageviews_novel_slug ON pageviews (novel_slug);
CREATE INDEX idx_pageviews_viewed_at  ON pageviews (viewed_at);
```

### 2.7 reading_progress テーブル

```sql
CREATE TABLE reading_progress (
    id               SERIAL PRIMARY KEY,
    session_id       VARCHAR(100) NOT NULL,
    novel_slug       VARCHAR(100) NOT NULL REFERENCES novels(slug) ON DELETE CASCADE,
    chapter_number   INTEGER      NOT NULL,
    progress_percent INTEGER      NOT NULL DEFAULT 0
                         CHECK (progress_percent >= 0 AND progress_percent <= 100),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, novel_slug)
);

CREATE INDEX idx_reading_progress_session ON reading_progress (session_id);
```

---

## 3. REST API 仕様

### 3.1 共通仕様

- ベース URL: `/api`
- Content-Type: `application/json`
- 文字コード: UTF-8
- 認証: なし（Phase 2 スコープ外）
- セッション識別: `X-Session-ID` ヘッダー（UUID v4 形式）

#### 共通エラーレスポンス

```json
{
  "detail": "エラーメッセージ"
}
```

| HTTPステータス | 意味 |
|--------------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエスト不正 |
| 404 | リソース未発見 |
| 422 | バリデーションエラー |
| 500 | サーバーエラー |

### 3.2 GET /api/health

ヘルスチェックエンドポイント。

**レスポンス 200:**
```json
{ "status": "ok" }
```

### 3.3 GET /api/novels

小説一覧取得。

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| genre | string | - | ジャンルフィルタ（sf / fantasy / mystery / slice-of-life / horror / romance） |
| sort | string | updated_at_desc | ソート順（updated_at_desc / rating_desc / title_asc） |
| limit | integer | 20 | 取得件数（最大50） |
| offset | integer | 0 | オフセット |

**レスポンス 200:**
```json
{
  "total": 3,
  "items": [
    {
      "id": 1,
      "slug": "stellar-drift",
      "title": "星間漂流",
      "author": "AI",
      "genre": "sf",
      "tags": ["宇宙", "冒険", "SF", "AI", "友情"],
      "synopsis": "...",
      "characters": [
        { "name": "アキラ", "role": "船長、28歳", "description": "..." }
      ],
      "cover_image": "/images/novels/stellar-drift/cover.jpg",
      "rating": 4.5,
      "total_chapters": 5,
      "latest_chapter": 5,
      "update_schedule": "毎週月曜",
      "status": "active",
      "created_at": "2026-03-01T00:00:00Z",
      "updated_at": "2026-03-27T00:00:00Z"
    }
  ]
}
```

**入力値バリデーション:**
- `genre`: 許可値リストとの照合（IN句）。不正値は 422 を返す
- `sort`: 許可値リストとの照合。不正値は 422 を返す
- `limit`: 1〜50 の範囲。範囲外は 422 を返す
- `offset`: 0 以上。負値は 422 を返す

### 3.4 GET /api/novels/{slug}

小説詳細 + 章一覧取得。

**パスパラメータ:**
- `slug`: 小説スラッグ（例: `stellar-drift`）

**レスポンス 200:**
```json
{
  "id": 1,
  "slug": "stellar-drift",
  "title": "星間漂流",
  "author": "AI",
  "genre": "sf",
  "tags": ["宇宙", "冒険"],
  "synopsis": "...",
  "characters": [...],
  "cover_image": "/images/novels/stellar-drift/cover.jpg",
  "rating": 4.5,
  "total_chapters": 5,
  "latest_chapter": 5,
  "update_schedule": "毎週月曜",
  "status": "active",
  "created_at": "2026-03-01T00:00:00Z",
  "updated_at": "2026-03-27T00:00:00Z",
  "chapters": [
    {
      "id": 1,
      "number": 1,
      "title": "出発の朝",
      "published_at": "2026-03-01T00:00:00Z"
    }
  ]
}
```

**レスポンス 404:**
```json
{ "detail": "Novel not found" }
```

**入力値バリデーション:**
- `slug`: 英数字・ハイフンのみ許可（パターン: `^[a-z0-9\-]+$`）。不正パターンは 400 を返す

### 3.5 GET /api/novels/{slug}/chapters/{number}

章本文 + 挿絵取得。

**パスパラメータ:**
- `slug`: 小説スラッグ
- `number`: 章番号（1始まり整数）

**レスポンス 200:**
```json
{
  "id": 1,
  "novel_slug": "stellar-drift",
  "number": 1,
  "title": "出発の朝",
  "content": "# 第1話　出発の朝\n\n...",
  "illustrations": [
    {
      "id": 1,
      "image_path": "/illustrations/stellar-drift/ch1-scene.jpg",
      "alt_text": "宇宙船のブリッジから見える星々",
      "position": 2
    }
  ],
  "published_at": "2026-03-01T00:00:00Z"
}
```

**レスポンス 404:**
```json
{ "detail": "Chapter not found" }
```

**入力値バリデーション:**
- `slug`: `^[a-z0-9\-]+$` パターン検証
- `number`: 1 以上の整数。0 以下は 400 を返す

### 3.6 GET /api/novels/search

全文検索（pg_trgm）。

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| q | string | 必須 | 検索クエリ（1〜100文字） |
| limit | integer | 20 | 取得件数（最大50） |
| offset | integer | 0 | オフセット |

**レスポンス 200:**
```json
{
  "total": 1,
  "items": [
    {
      "slug": "magic-academy",
      "title": "魔法学園クロニクル",
      "genre": "fantasy",
      "synopsis": "...",
      "cover_image": "...",
      "rating": 4.8,
      "match_type": "synopsis"
    }
  ]
}
```

**入力値バリデーション:**
- `q`: 1〜100文字。空文字・未指定は 422 を返す。SQL インジェクション対策としてパラメータバインドを使用（ORM クエリのみ、生 SQL 禁止）

### 3.7 POST /api/bookmarks

ブックマーク保存（upsert）。

**リクエストヘッダー:**
```
X-Session-ID: <UUID v4>
```

**リクエストボディ:**
```json
{
  "novel_slug": "stellar-drift",
  "chapter_number": 3
}
```

**レスポンス 201:**
```json
{
  "id": 1,
  "session_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "novel_slug": "stellar-drift",
  "chapter_number": 3,
  "created_at": "2026-03-28T00:00:00Z"
}
```

**入力値バリデーション:**
- `X-Session-ID`: UUID v4 形式。不正形式は 400 を返す
- `novel_slug`: `^[a-z0-9\-]+$`、最大100文字
- `chapter_number`: 1 以上の整数

### 3.8 GET /api/bookmarks

ブックマーク一覧取得。

**リクエストヘッダー:**
```
X-Session-ID: <UUID v4>
```

**レスポンス 200:**
```json
[
  {
    "id": 1,
    "novel_slug": "stellar-drift",
    "chapter_number": 3,
    "created_at": "2026-03-28T00:00:00Z"
  }
]
```

### 3.9 DELETE /api/bookmarks/{novel_slug}

ブックマーク削除。

**リクエストヘッダー:**
```
X-Session-ID: <UUID v4>
```

**レスポンス 200:**
```json
{ "deleted": true }
```

**レスポンス 404:**
```json
{ "detail": "Bookmark not found" }
```

### 3.10 POST /api/analytics/pageview

PV 記録。

**リクエストボディ:**
```json
{
  "novel_slug": "stellar-drift",
  "chapter_number": 1,
  "session_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**レスポンス 201:**
```json
{ "recorded": true }
```

**入力値バリデーション:**
- `novel_slug`: `^[a-z0-9\-]+$`、最大100文字
- `chapter_number`: null 許容（小説トップページ PV）または 1 以上の整数
- `session_id`: UUID v4 形式。不正値はサーバー側で採番（エラーにしない）

### 3.11 GET /api/analytics/dashboard

分析集計取得。

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| days | integer | 30 | 集計期間（1〜365日） |

**レスポンス 200:**
```json
{
  "period_days": 30,
  "total_pageviews": 1234,
  "novels": [
    {
      "slug": "stellar-drift",
      "title": "星間漂流",
      "pageviews": 500,
      "unique_sessions": 120
    }
  ],
  "daily_trend": [
    { "date": "2026-03-28", "pageviews": 45 }
  ]
}
```

### 3.12 POST /api/generate/chapter

章生成トリガー。既存スクリプト（`generate-chapter.ts`）の API 化。

**リクエストボディ:**
```json
{
  "novel_slug": "stellar-drift",
  "chapter_number": null
}
```

- `chapter_number`: null の場合、次章番号を自動算出

**レスポンス 202:**
```json
{
  "status": "accepted",
  "novel_slug": "stellar-drift",
  "chapter_number": 6
}
```

**レスポンス 404:**
```json
{ "detail": "Novel not found" }
```

**入力値バリデーション:**
- `novel_slug`: DB に存在する slug のみ許可（存在確認クエリを実行）
- `chapter_number`: null または 1 以上の整数

---

## 4. JSON → DB マイグレーション設計

### 4.1 マイグレーション対象データ

| ファイル | 移行先テーブル | 件数 |
|---------|------------|------|
| `frontend/data/novels.json` | novels | 3件 |
| `frontend/data/chapters/stellar-drift.json` | chapters, illustrations | 5件 |
| `frontend/data/chapters/magic-academy.json` | chapters, illustrations | 4件 |
| `frontend/data/chapters/daily-life.json` | chapters, illustrations | 4件 |

### 4.2 seed スクリプト設計

`api/scripts/seed_from_json.py`

```
処理フロー:
1. novels.json を読み込み、novels テーブルへ INSERT（UPSERT on slug）
2. 各 chapters/*.json を読み込み、chapters テーブルへ INSERT（UPSERT on novel_slug + number）
3. 各章の illustrations を illustrations テーブルへ INSERT
4. novels の total_chapters / latest_chapter を集計値で UPDATE
5. 実行後、件数サマリーをログ出力
```

**ロールバック対応:**
- Alembic は downgrade をサポート（migrate サービスで `alembic downgrade -1` 実行可能）
- seed データは冪等（`INSERT ... ON CONFLICT DO UPDATE`）

### 4.3 フィールドマッピング

| JSON フィールド | DB カラム | 変換 |
|----------------|-----------|------|
| id（`novel-001`） | - | 使用しない（SERIAL を使用） |
| slug | slug | そのまま |
| characters（配列） | characters（JSONB） | JSON → JSONB |
| coverImage | cover_image | キャメル → スネーク変換 |
| totalChapters | total_chapters | 同上 |
| latestChapter | latest_chapter | 同上 |
| updateSchedule | update_schedule | 同上 |
| createdAt | created_at | ISO8601 → TIMESTAMPTZ |
| illustrations[].url | illustrations.image_path | url → image_path |
| illustrations[].caption | illustrations.alt_text | caption → alt_text |
| illustrations[].insertAfterParagraph | illustrations.position | 同名変換 |

---

## 5. セキュリティ設計

### 5.1 入力値サニタイズ方針

| 入力経路 | サニタイズ方法 |
|---------|-------------|
| パスパラメータ（slug） | 正規表現 `^[a-z0-9\-]+$` で許可リスト検証。FastAPI の Path validator を使用 |
| パスパラメータ（number） | `ge=1` の整数制約（FastAPI Path）|
| クエリパラメータ（genre, sort） | Enum 型による許可値照合 |
| クエリパラメータ（limit, offset） | min/max 範囲制約 |
| ボディ（novel_slug） | Pydantic regex バリデーション |
| ボディ（session_id） | UUID 型バリデーション |
| X-Session-ID ヘッダー | UUID 型パース失敗時は 400 |
| DB クエリ | SQLAlchemy ORM のパラメータバインドのみ使用。生 SQL 禁止 |
| 全文検索クエリ | 最大100文字制限 + ORM パラメータバインド |

### 5.2 セキュリティヘッダー

Caddy で以下を設定（既存設定を継承）:

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

API レスポンスに追加:
```
X-Content-Type-Options: nosniff
```

### 5.3 DB 接続

- 接続文字列は環境変数（`DATABASE_URL`）で管理。コードに直書き禁止
- PostgreSQL ユーザーは `novels` 専用（superuser 不使用）
- パスワードは Docker secrets または環境変数経由

---

## 6. 非機能要件・性能設計

### 6.1 レスポンスタイム目標

| エンドポイント | 目標値 | 対策 |
|-------------|-------|------|
| GET /api/novels | < 200ms | novels テーブルインデックス（genre, status） |
| GET /api/novels/{slug}/chapters/{number} | < 300ms | (novel_slug, number) 複合インデックス |
| GET /api/novels/search | < 500ms | GIN インデックス（pg_trgm） |
| POST /api/analytics/pageview | < 100ms | 非同期 INSERT（FastAPI Background Tasks） |

### 6.2 コネクションプール

- SQLAlchemy `pool_size=5`, `max_overflow=10`
- PostgreSQL max_connections = 20（デフォルト 100 から変更不要）

### 6.3 メモリ制限

- postgres コンテナ: 512MB（R-003 リスク対策）
- api コンテナ: 256MB
