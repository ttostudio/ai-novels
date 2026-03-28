---
issue: "ttostudio/ttoClaw#25"
version: "1.0"
author-role: QA Engineer
gate: Gate-3
status: draft
---

# 結合テスト・E2E テスト仕様書 — Phase 2: バックエンド構築・DB移行・API化

## 1. 結合テスト（実 PostgreSQL 必須）

> **Gate 5 要件**: モックのみの結合テストは不合格。必ず実 PostgreSQL に接続してテストを実行すること。

### 1.1 conftest.py 設計

```python
# api/tests/integration/conftest.py
import pytest
import psycopg2
from alembic.config import Config
from alembic import command
from fastapi.testclient import TestClient
from app.main import app

TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://novels_user:novels_pass@localhost:5433/ai_novels_test"
)

@pytest.fixture(scope="session")
def db_connection():
    """セッションスコープ: テスト DB 作成 + マイグレーション適用"""
    conn = psycopg2.connect(TEST_DATABASE_URL)
    conn.autocommit = True

    # Alembic マイグレーション適用
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(alembic_cfg, "head")

    yield conn
    conn.close()

@pytest.fixture(scope="function")
def db_session(db_connection):
    """関数スコープ: 各テスト後にロールバック（状態リセット）"""
    conn = db_connection
    conn.autocommit = False
    yield conn
    conn.rollback()
    conn.autocommit = True

@pytest.fixture(scope="function")
def seed_data(db_session):
    """テストデータ挿入（DBスキーマと完全一致）"""
    cur = db_session.cursor()

    # novels テーブル（カラム名は 04-db-schema.md に準拠）
    cur.execute("""
        INSERT INTO novels (slug, title, synopsis, genre, status, total_chapters, author, characters, cover_image, rating, latest_chapter, update_schedule)
        VALUES
          ('stellar-drift', '星間漂流', '宇宙漂流SFのあらすじ', 'sf', 'active', 5, 'AI Author', '[]', '/images/cover.jpg', 4.5, 5, 'weekly'),
          ('magic-academy', '魔法学園クロニクル', '魔法学園ファンタジー', 'fantasy', 'active', 4, 'AI Author', '[]', '/images/cover.jpg', 4.2, 4, 'weekly'),
          ('daily-life', '日常茶飯事', '日常系コメディ', 'slice-of-life', 'active', 4, 'AI Author', '[]', '/images/cover.jpg', 4.0, 4, 'weekly')
    """)

    # chapters テーブル（Markdown 本文含む）
    cur.execute("""
        INSERT INTO chapters (novel_slug, number, title, content, published_at)
        SELECT n.id, 1, '目覚め', '# 目覚め\n\n宇宙の彼方で目が覚めた。', NOW()
        FROM novels n WHERE n.slug = 'stellar-drift'
    """)
    cur.execute("""
        INSERT INTO chapters (novel_slug, number, title, content, published_at)
        SELECT n.id, 2, '星の海へ', '# 星の海へ\n\n星が眩しく輝いていた。', NOW()
        FROM novels n WHERE n.slug = 'stellar-drift'
    """)
    cur.execute("""
        INSERT INTO chapters (novel_slug, number, title, content, published_at)
        SELECT n.id, 1, '入学', '# 入学\n\n魔法学園の門をくぐった。', NOW()
        FROM novels n WHERE n.slug = 'magic-academy'
    """)

    db_session.commit()
    yield
    # ロールバックは db_session フィクスチャが実施

@pytest.fixture(scope="function")
def client(db_session):
    """TestClient（DB セッションをオーバーライド）"""
    return TestClient(app)
```

---

### 1.2 INT-001: GET /api/novels — 小説一覧（実 DB）

**ファイル**: `api/tests/integration/test_novels.py`

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| INT-001-01 | 全件返却（実DB） | seed_data で3件挿入済み | GET /api/novels | status=200, items=3 |
| INT-001-02 | ジャンルフィルタ（実DB） | seed_data | GET /api/novels?genre=SF | items=1, slug="stellar-drift" |
| INT-001-03 | 存在しないジャンル（実DB） | seed_data | GET /api/novels?genre=horror | items=[] |
| INT-001-04 | レスポンス時間 | seed_data | GET /api/novels | < 200ms（NFR-001） |

---

### 1.3 INT-002: GET /api/novels/{slug} — 小説詳細（実 DB）

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| INT-002-01 | stellar-drift 詳細（実DB） | seed_data | GET /api/novels/stellar-drift | status=200, chapters に2件含まれる |
| INT-002-02 | 存在しない slug（実DB） | seed_data | GET /api/novels/not-exist | status=404 |
| INT-002-03 | chapters 順序 | seed_data | GET /api/novels/stellar-drift | chapters が number 昇順で返却される |

---

### 1.4 INT-003: GET /api/novels/{slug}/chapters/{number} — 章本文（実 DB）

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| INT-003-01 | 章本文取得（実DB） | seed_data（stellar-drift/1 あり） | GET /api/novels/stellar-drift/chapters/1 | status=200, content="# 目覚め\n\n..." |
| INT-003-02 | Markdown 内容確認（実DB） | seed_data | 同上 | content が DB に挿入した Markdown と一致 |
| INT-003-03 | 存在しない章（実DB） | seed_data | GET /api/novels/stellar-drift/chapters/999 | status=404 |
| INT-003-04 | レスポンス時間 | seed_data | GET /api/novels/stellar-drift/chapters/1 | < 300ms（NFR-002） |

---

### 1.5 INT-004: GET /api/novels/search — 全文検索（実 DB + pg_trgm）

> **注意**: pg_trgm 拡張が有効な PostgreSQL が必要。`CREATE EXTENSION IF NOT EXISTS pg_trgm;` をマイグレーションに含めること。

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| INT-004-01 | タイトル検索「魔法」 | seed_data（AC-005対応） | GET /api/novels/search?q=魔法 | magic-academy が results に含まれる |
| INT-004-02 | タイトル検索「宇宙」 | seed_data（description に宇宙含む） | GET /api/novels/search?q=宇宙 | stellar-drift が返却される |
| INT-004-03 | ヒットなし | seed_data | GET /api/novels/search?q=xxxxxxnotexist | results=[], total=0 |
| INT-004-04 | 部分一致 | seed_data | GET /api/novels/search?q=星 | stellar-drift（タイトル「星間漂流」）が返却 |

---

### 1.6 INT-005: POST /api/bookmarks — ブックマーク作成（実 DB）

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| INT-005-01 | 作成後 DB に記録（実DB） | seed_data | POST /api/bookmarks {session_id: "test-session", novel_slug: "stellar-drift", chapter_number: 1} | status=201, DB の bookmarks テーブルに1件追加 |
| INT-005-02 | 同一セッション・同章の重複 | INT-005-01 実行後 | 同一リクエスト再送 | status=200 or 201, bookmarks テーブルに重複なし（または許容設計に従う） |

```python
# INT-005-01 実装例
def test_int005_01_create_bookmark(client, seed_data, db_session):
    response = client.post("/api/bookmarks", json={
        "session_id": "test-session",
        "novel_slug": "stellar-drift",
        "chapter_number": 1
    })
    assert response.status_code == 201

    # 実 DB に記録されたことを確認
    cur = db_session.cursor()
    cur.execute("SELECT COUNT(*) FROM bookmarks WHERE session_id = 'test-session'")
    count = cur.fetchone()[0]
    assert count == 1
```

---

### 1.7 INT-006: GET /api/bookmarks — ブックマーク一覧（実 DB）

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| INT-006-01 | セッションのブックマーク取得（実DB） | INT-005-01 実行後 | GET /api/bookmarks?session_id=test-session | items=1, novel_slug="stellar-drift" |
| INT-006-02 | 他セッションと分離（実DB） | session-A, session-B 両方にブックマークあり | GET /api/bookmarks?session_id=session-A | session-B のブックマークは含まれない |

---

### 1.8 INT-007: POST /api/analytics/pageview — PV 記録（実 DB）

> **AC-004 対応**: PV 記録が DB に永続化されることを実 DB で確認する。

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| INT-007-01 | PV 記録後 DB に永続化（実DB） | seed_data | POST /api/analytics/pageview {novel_slug: "stellar-drift", chapter_number: 1, session_id: "s1"} | status=200/201, pageviews テーブルに記録あり |
| INT-007-02 | 異なるセッションで複数 PV（実DB） | seed_data | 3セッションで同章に POST | pageviews テーブルに3件記録 |

```python
# INT-007-01 実装例
def test_int007_01_pageview_persisted(client, seed_data, db_session):
    response = client.post("/api/analytics/pageview", json={
        "novel_slug": "stellar-drift",
        "chapter_number": 1,
        "session_id": "test-session-pv"
    })
    assert response.status_code in (200, 201)

    # 実 DB に永続化されたことを確認（AC-004）
    cur = db_session.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM pageviews WHERE session_id = 'test-session-pv'"
    )
    count = cur.fetchone()[0]
    assert count == 1
```

---

### 1.9 INT-008: データ移行スクリプト検証（実 DB）

**ファイル**: `api/tests/integration/test_migration.py`

| テスト ID | テスト名 | 操作 | 期待結果 |
|---------|---------|------|---------|
| INT-008-01 | JSON → DB 移行後 novels 件数 | マイグレーションスクリプト実行 | novels テーブルに3件（stellar-drift, magic-academy, daily-life） |
| INT-008-02 | JSON → DB 移行後 chapters 件数 | 同上 | chapters テーブルに13件以上 |
| INT-008-03 | 移行後 GET /api/novels が正常動作 | 移行後に API 呼び出し | status=200, items=3 |

---

## 2. E2E テスト（Playwright）

> **Gate 5 要件**: E2E テストは**デプロイ済みの実環境**（`http://localhost:3600`）に対して実行する。
> デプロイ前に書く場合はセレクタを `[data-testid]` 属性で確保し、実 UI に合わせて更新すること。

### 2.1 設定

```ts
// frontend/playwright.config.ts（Phase 2 用追記）
export default defineConfig({
  use: {
    baseURL: 'http://localhost:3600',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

### 2.2 E2E-101: ホーム画面表示（小説一覧）

**ファイル**: `frontend/e2e/phase2/novels-list.spec.ts`

| テスト ID | テスト名 | 操作 | 期待結果 |
|---------|---------|------|---------|
| E2E-101-01 | ホーム画面に3作品が表示される | `http://localhost:3600` にアクセス | 3つの小説カードが表示される（API から取得） |
| E2E-101-02 | 小説カードにタイトル・ジャンルが表示される | ホーム画面確認 | 「星間漂流」「魔法学園クロニクル」「日常茶飯事」が見える |
| E2E-101-03 | ジャンルフィルタ操作 | SF フィルタを選択 | 「星間漂流」のみ表示される |

---

### 2.3 E2E-102: 小説詳細 → 章閲覧フロー

**ファイル**: `frontend/e2e/phase2/chapter-flow.spec.ts`

| テスト ID | テスト名 | 操作 | 期待結果 |
|---------|---------|------|---------|
| E2E-102-01 | 小説カードクリック → 詳細ページ遷移 | 「星間漂流」カードをクリック | `/novel/stellar-drift` に遷移、章一覧が表示 |
| E2E-102-02 | 第1章をクリック → 章本文表示 | 第1章リンクをクリック | `/novel/stellar-drift/1` に遷移、Markdown 本文が表示 |
| E2E-102-03 | 章本文が空でない | 章ページを確認 | 本文テキストが1文字以上表示されている |
| E2E-102-04 | 次章ナビゲーション | 第1章ページで「次の章」クリック | 第2章ページに遷移 |
| E2E-102-05 | レスポンス時間 | 章ページ遷移 | `networkidle` まで 3000ms 以内 |

---

### 2.4 E2E-103: 検索フロー

**ファイル**: `frontend/e2e/phase2/search-flow.spec.ts`

| テスト ID | テスト名 | 操作 | 期待結果 |
|---------|---------|------|---------|
| E2E-103-01 | 検索ボックスに「魔法」入力 → 結果表示 | 検索ボックスに「魔法」入力 → 検索実行 | 「魔法学園クロニクル」が結果に表示される（AC-005） |
| E2E-103-02 | ヒットなし | 「xxxxxxnotexist」で検索 | 「見つかりませんでした」等のメッセージ表示 |
| E2E-103-03 | 検索結果クリック → 詳細遷移 | 結果の「魔法学園クロニクル」をクリック | 詳細ページに遷移 |

---

### 2.5 E2E-104: ブックマーク操作

**ファイル**: `frontend/e2e/phase2/bookmark-flow.spec.ts`

| テスト ID | テスト名 | 操作 | 期待結果 |
|---------|---------|------|---------|
| E2E-104-01 | 章ページでブックマーク追加 | 章ページのブックマークボタンをクリック | ブックマーク追加完了（ボタン状態変化 or トースト表示） |
| E2E-104-02 | ブックマーク一覧で追加済みの章が表示 | ブックマーク一覧ページに遷移 | 追加した章が表示されている |
| E2E-104-03 | ブックマーク削除 | ブックマーク一覧で削除ボタンをクリック | 該当ブックマークが一覧から消える |

---

### 2.6 E2E-105: 回帰テスト（既存画面が壊れていないこと）

**ファイル**: `frontend/e2e/phase2/regression.spec.ts`

> Phase 1 で実装済みの機能が、API 接続切替後も正常動作することを確認（NFR-004・AC-006）。

| テスト ID | テスト名 | 操作 | 期待結果 |
|---------|---------|------|---------|
| E2E-105-01 | ホーム画面が正常表示される | `http://localhost:3600` | 小説カードが3件表示（クラッシュなし） |
| E2E-105-02 | 既存アナリティクスダッシュボード | `/analytics` にアクセス | 正常表示（エラーなし） |
| E2E-105-03 | PV 記録が動作する | 章ページ訪問 | エラーなし（API 記録 or localStorage フォールバック） |
| E2E-105-04 | 読了率トラッキング | 章末尾までスクロール | 読了率が更新される |
| E2E-105-05 | 既存 E2E（analytics-flow.spec.ts）が PASS | `npx playwright test e2e/analytics-flow.spec.ts` | 全テスト PASS |

---

### 2.7 E2E-106: エラーハンドリング

**ファイル**: `frontend/e2e/phase2/error-handling.spec.ts`

| テスト ID | テスト名 | 操作 | 期待結果 |
|---------|---------|------|---------|
| E2E-106-01 | 存在しない小説 slug にアクセス | `/novel/not-exist` にアクセス | 404 ページまたはエラーメッセージ表示（クラッシュなし） |
| E2E-106-02 | 存在しない章番号にアクセス | `/novel/stellar-drift/9999` にアクセス | 404 ページまたはエラーメッセージ（クラッシュなし） |

---

## 3. Gate 5 チェックリスト（テスト実行時に記入）

| チェック項目 | 状態 | 備考 |
|------------|------|------|
| バックエンド UT 全件 PASS（pytest tests/unit/） | [ ] | — |
| フロントエンド UT 全件 PASS（vitest） | [ ] | — |
| 結合テスト 実 PostgreSQL 接続で実行（pytest tests/integration/） | [ ] | **必須**: docker-compose.test.yml の postgres-test 使用 |
| 結合テスト 全件 PASS | [ ] | — |
| E2E テスト デプロイ済み環境（localhost:3600）で実行 | [ ] | **必須**: 事前デプロイ確認 |
| E2E テスト 全件 PASS（phase2/ ディレクトリ） | [ ] | — |
| 既存 E2E（analytics-flow.spec.ts）回帰なし | [ ] | — |
| SKIP テストに理由明記 | [ ] | `@pytest.mark.skip(reason=...)` or `it.skip(...)` |
| バックエンドカバレッジ 80%+ | [ ] | `pytest-cov` レポート添付 |
| フロントエンドカバレッジ 80%+ | [ ] | vitest coverage レポート添付 |
| INT-007-01: PV が実 DB に永続化（AC-004） | [ ] | DB 確認コマンド記録 |
| INT-004-01: 「魔法」検索で magic-academy 返却（AC-005） | [ ] | — |

---

## 4. バグレポートテンプレート

テスト実行中にバグを発見した場合は以下の形式で記録する:

```
## バグ報告 BUG-{番号}

- **発見テスト**: INT-xxx-xx / E2E-xxx-xx
- **タイトル**:
- **再現手順**:
  1.
  2.
- **期待結果**:
- **実際の結果**:
- **スクリーンショット/ログ**:
- **優先度**: P0（クリティカル）/ P1（高）/ P2（中）/ P3（低）
```
