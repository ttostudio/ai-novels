---
issue: "ttostudio/ttoClaw#25"
version: "1.0"
author-role: QA Engineer
gate: Gate-3
status: draft
---

# ユニットテスト仕様書 — Phase 2: バックエンド構築・DB移行・API化

## 1. バックエンド UT（pytest）

### 1.1 環境・前提

- フレームワーク: pytest + httpx（FastAPI TestClient）
- DB: **モック可**（UT では DB アクセスを Repository/Service レイヤーでモック）
- ファイル配置: `api/tests/unit/`

```
api/tests/unit/
├── conftest.py          # モック設定、テストデータ定数
├── test_novels_api.py   # 小説一覧・詳細
├── test_chapters_api.py # 章エンドポイント
├── test_search_api.py   # 検索
├── test_bookmarks_api.py
└── test_analytics_api.py
```

---

### 1.2 UT-001: GET /api/novels — 小説一覧

**ファイル**: `api/tests/unit/test_novels_api.py`

```python
# テストデータ定数（DBスキーマと完全一致させること）
NOVEL_FIXTURES = [
    {
        "id": 1,
        "slug": "stellar-drift",
        "title": "星間漂流",
        "synopsis": "宇宙漂流SFのあらすじ",
        "genre": "sf",
        "status": "active",
        "total_chapters": 5,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": 2,
        "slug": "magic-academy",
        "title": "魔法学園クロニクル",
        "synopsis": "魔法学園ファンタジーのあらすじ",
        "genre": "fantasy",
        "status": "active",
        "total_chapters": 4,
        "created_at": "2026-01-02T00:00:00Z",
        "updated_at": "2026-01-02T00:00:00Z",
    },
    {
        "id": 3,
        "slug": "daily-life",
        "title": "日常茶飯事",
        "synopsis": "日常系コメディのあらすじ",
        "genre": "slice-of-life",
        "status": "active",
        "total_chapters": 4,
        "created_at": "2026-01-03T00:00:00Z",
        "updated_at": "2026-01-03T00:00:00Z",
    },
]
```

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| UT-001-01 | 全件返却 | novels に3件存在 | GET /api/novels | status=200, items 3件, slug/title/genre 含む |
| UT-001-02 | ジャンルフィルタ | novels に3件 | GET /api/novels?genre=sf | items に genre="SF" のみ返却 |
| UT-001-03 | 存在しないジャンル | novels に3件 | GET /api/novels?genre=horror | items=[] |
| UT-001-04 | ソート（更新日降順） | novels に3件（更新日異なる） | GET /api/novels?sort=updated_at_desc | 最新が先頭 |
| UT-001-05 | novels が空 | novels に0件 | GET /api/novels | status=200, items=[] |

---

### 1.3 UT-002: GET /api/novels/{slug} — 小説詳細

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| UT-002-01 | 存在する slug | stellar-drift 存在 | GET /api/novels/stellar-drift | status=200, slug="stellar-drift", chapters 配列含む |
| UT-002-02 | 存在しない slug | DB にない slug | GET /api/novels/not-exist | status=404, detail 含む |
| UT-002-03 | chapters 配列の型 | chapters あり | GET /api/novels/stellar-drift | chapters[0] に number, title, published_at 含む |

---

### 1.4 UT-003: GET /api/novels/{slug}/chapters/{number} — 章本文

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| UT-003-01 | 存在する章 | stellar-drift/1 あり | GET /api/novels/stellar-drift/chapters/1 | status=200, content（Markdown文字列）含む |
| UT-003-02 | 存在しない章番号 | chapters に chapter 1 のみ | GET /api/novels/stellar-drift/chapters/999 | status=404 |
| UT-003-03 | 存在しない slug | — | GET /api/novels/not-exist/chapters/1 | status=404 |
| UT-003-04 | Markdown 返却 | chapter の content に `# タイトル` を含む | GET /api/novels/stellar-drift/chapters/1 | content が `#` から始まる Markdown 文字列 |
| UT-003-05 | illustrations 配列 | chapter に挿絵あり | GET /api/novels/stellar-drift/chapters/1 | illustrations 配列が含まれる |

---

### 1.5 UT-004: GET /api/novels/search — 全文検索

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| UT-004-01 | タイトル一致 | "魔法学園" が存在 | GET /api/novels/search?q=魔法 | magic-academy が items に含まれる |
| UT-004-02 | あらすじ一致 | 本文に "宇宙" が含まれる novel | GET /api/novels/search?q=宇宙 | 該当 novel が返却される |
| UT-004-03 | ヒットなし | マッチしないキーワード | GET /api/novels/search?q=xxxxxxnotexist | items=[], total=0 |
| UT-004-04 | 空クエリ | — | GET /api/novels/search?q= | status=422 または status=200 で全件返却（設計に従う） |
| UT-004-05 | q パラメータなし | — | GET /api/novels/search | status=422（q 必須） |

---

### 1.6 UT-005: POST /api/bookmarks — ブックマーク作成

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| UT-005-01 | 正常作成 | novel/chapter 存在 | POST /api/bookmarks {novel_slug, chapter_number} + X-Session-ID ヘッダー | status=201, bookmark_id 返却 |
| UT-005-02 | 重複作成 | 同セッション・同章のブックマーク存在 | POST /api/bookmarks（同一リクエスト再送） | status=200 または 201（冪等性） |
| UT-005-03 | novel_slug 不正 | novel が存在しない | POST /api/bookmarks {novel_slug: "not-exist"} | status=404 |
| UT-005-04 | X-Session-ID 欠損 | — | POST /api/bookmarks {novel_slug, chapter_number}（X-Session-ID なし） | status=422 |

---

### 1.7 UT-006: GET /api/bookmarks — ブックマーク一覧

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| UT-006-01 | 一覧取得 | session_id に2件のブックマーク | GET /api/bookmarks + X-Session-ID: xxx | status=200, items 2件 |
| UT-006-02 | 空一覧 | session_id にブックマークなし | GET /api/bookmarks + X-Session-ID: yyy | status=200, items=[] |
| UT-006-03 | X-Session-ID 欠損 | — | GET /api/bookmarks（ヘッダーなし） | status=422 |

---

### 1.8 UT-007: DELETE /api/bookmarks/{id} — ブックマーク削除

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| UT-007-01 | 正常削除 | bookmark_id=1 存在 | DELETE /api/bookmarks/1 | status=204 |
| UT-007-02 | 存在しない ID | bookmark_id=999 なし | DELETE /api/bookmarks/999 | status=404 |

---

### 1.9 UT-008: POST /api/analytics/pageview — PV 記録

| テスト ID | テスト名 | 前提条件 | 操作 | 期待結果 |
|---------|---------|---------|------|---------|
| UT-008-01 | 正常記録 | chapter 存在 | POST /api/analytics/pageview {novel_slug, chapter_number, session_id} | status=200 または 201 |
| UT-008-02 | 同章 PV 重複 | 同セッション・同章の PV 記録済み | 再送 | status=200（重複カウントの扱いは設計による） |
| UT-008-03 | novel_slug 不正 | — | POST /api/analytics/pageview {novel_slug: "not-exist"} | status=404 |
| UT-008-04 | 必須パラメータ欠損 | — | novel_slug のみ送信 | status=422 |

---

## 2. フロントエンド UT（vitest）

### 2.1 環境・前提

- フレームワーク: vitest + @testing-library/react（既存設定継承）
- `vitest.config.ts` の `coverage.include` を以下に拡張:
  ```ts
  include: ["hooks/**", "components/analytics/**", "lib/api/**", "components/**"]
  ```
- API 通信は `fetch` モック（`vi.mock` / `vi.spyOn(global, 'fetch')`）

### 2.2 UT-101: API クライアント関数

**ファイル**: `frontend/__tests__/lib/api.test.ts`

| テスト ID | 関数 | テスト名 | モック | 期待結果 |
|---------|-----|---------|-------|---------|
| UT-101-01 | `fetchNovels()` | 正常取得 | fetch → 200 + novel配列 | novels 配列を返す |
| UT-101-02 | `fetchNovels({genre})` | ジャンルフィルタ | fetch → フィルタ済み配列 | 正しいクエリパラメータで fetch 呼び出し |
| UT-101-03 | `fetchNovel(slug)` | 正常取得 | fetch → 200 + novel | novel オブジェクト返す |
| UT-101-04 | `fetchNovel(slug)` | 404 時 | fetch → 404 | null または throw を返す |
| UT-101-05 | `fetchChapter(slug, num)` | 正常取得 | fetch → 200 + chapter | content（Markdown）含む chapter 返す |
| UT-101-06 | `fetchChapter(slug, num)` | 404 時 | fetch → 404 | null または throw |
| UT-101-07 | `searchNovels(q)` | 検索 | fetch → 200 + results | items 配列返す |
| UT-101-08 | `addBookmark(...)` | 作成 | fetch → 201 | bookmark_id 返す |
| UT-101-09 | `getBookmarks(sessionId)` | 一覧 | fetch → 200 + items | items 配列返す |
| UT-101-10 | `deleteBookmark(id)` | 削除 | fetch → 204 | 例外なし |
| UT-101-11 | `recordPageview(...)` | PV記録 | fetch → 200 | 例外なし |

---

### 2.3 UT-102: 検索コンポーネント

**ファイル**: `frontend/__tests__/components/SearchBox.test.tsx`（対象コンポーネントが実装後に確定）

| テスト ID | テスト名 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-102-01 | 入力→検索 API 呼び出し | テキスト入力 → Enter / ボタンクリック | searchNovels が適切なクエリで呼ばれる |
| UT-102-02 | 結果表示 | API が2件返却 | 2件の小説タイトルが表示される |
| UT-102-03 | 結果0件 | API が [] 返却 | 「見つかりませんでした」等のメッセージ表示 |
| UT-102-04 | ローディング状態 | fetch 実行中 | ローディングインジケーター表示 |
| UT-102-05 | エラー状態 | fetch → throw | エラーメッセージ表示（クラッシュしない） |

---

### 2.4 UT-103: エラー / ローディング状態

**ファイル**: `frontend/__tests__/components/NovelList.test.tsx` 等（実装後に確定）

| テスト ID | 対象コンポーネント | テスト名 | 期待結果 |
|---------|----------------|---------|---------|
| UT-103-01 | NovelList / 小説一覧ページ | ローディング中 | スケルトン or ローディング表示 |
| UT-103-02 | NovelList | API エラー | エラーメッセージ表示、クラッシュなし |
| UT-103-03 | ChapterPage | 章読み込み中 | ローディング表示 |
| UT-103-04 | ChapterPage | 404（章なし） | 404 メッセージ表示 |

---

## 3. SKIP テスト管理

SKIP テストには必ず理由を明記する:

```python
# バックエンド
@pytest.mark.skip(reason="FR-010 POST /generate/chapter は Phase 2 後半実装予定 (2026-04-xx)")
def test_generate_chapter():
    ...
```

```ts
// フロントエンド
it.skip("管理画面コンポーネント（Phase 3 対象）", () => {
  // Phase 3: 管理画面 UI は対象外
})
```

---

## 4. テスト命名規則

```
# pytest
def test_{テストID小文字}_{スネークケース説明}():
例: def test_ut001_01_novels_returns_all():

# vitest
it("UT-101-01: fetchNovels が novels 配列を返す", () => {})
```
