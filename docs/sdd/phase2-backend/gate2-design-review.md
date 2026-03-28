# Gate 2 設計レビュー結果

- **レビュー日**: 2026-03-28
- **レビュアー**: Design Reviewer（独立レビュー）
- **対象 SDD**: Phase 2 バックエンド構築・DB移行・API化（01〜08）
- **Issue**: ttostudio/ttoClaw#25

## 総合判定: CONDITIONAL PASS

修正必須の Critical 指摘 4件を解消すれば PASS とする。
Major 指摘は実装フェーズ開始前の解消を強く推奨する。

---

## チェック結果

| チェック項目 | 判定 | 指摘事項 |
|------------|------|---------|
| DR-G2-01: 要件と設計の整合性（FR/NFR/AC → 設計反映） | ⚠️ CONDITIONAL | FR-009 の章レベル検索が API 未対応（C-02）、reading_progress テーブルに対応 API なし（M-03） |
| DR-G2-02: 画面仕様の品質（レスポンシブ、デザイントークン、状態遷移） | ✅ PASS | ブレークポイント値・デザイントークンは既存 Tailwind 設定と整合。スケルトン・エラー状態も網羅的に定義済み |
| DR-G2-03: API/DB 設計の品質（セキュリティ、パフォーマンス、命名規則） | ✅ PASS | 入力値サニタイズ方針が詳細に記載（§5.1）。ORM パラメータバインド必須、生 SQL 禁止を明記。パフォーマンス目標値も具体的 |
| DR-G2-04: テスト設計の網羅性（全AC カバー、結合テスト実DB、E2E） | ⚠️ CONDITIONAL | テストフィクスチャの DB スキーマ不整合（C-01）、テーブル名参照誤り（C-03） |
| DR-G2-05: 実装可能性（技術的リスク、既存コードへの影響） | ✅ PASS | Docker Compose 完結、Alembic マイグレーション、ロールバック手順明記。SSG→API 切替の段階的移行方針も妥当 |
| DR-G2-06: ドキュメント間の整合性（型名、カラム名、エンドポイント名） | ❌ FAIL | ブックマーク API 契約が3ドキュメント間で矛盾（C-04）、カラム名不整合多数（C-01） |

---

## 指摘事項一覧

### Critical（修正必須）

#### C-01: テストフィクスチャと DB スキーマのカラム名・値不整合（DR-G2-06）

**対象ファイル**: 07-unit-test-spec.md / 08-integration-test-spec.md

UT・結合テストのフィクスチャデータが、04-external-design.md の DB スキーマと一致していない。このまま実装するとテストが全て失敗する。

| 箇所 | フィクスチャの記述 | DB スキーマ（04-external-design.md） | 修正方針 |
|------|------------------|-------------------------------------|---------|
| UT-001 `NOVEL_FIXTURES` | `"description"` | `synopsis` (TEXT) | `description` → `synopsis` に修正 |
| UT-001 `NOVEL_FIXTURES` | `"status": "ongoing"` | CHECK: `'active', 'paused', 'completed'` | `"ongoing"` → `"active"` に修正 |
| UT-001 `NOVEL_FIXTURES` | `"genre": "SF"` | API バリデーション: `sf`（小文字） | `"SF"` → `"sf"` に修正 |
| UT-001 `NOVEL_FIXTURES` | `"genre": "slice_of_life"` | API バリデーション: `slice-of-life`（ハイフン） | `"slice_of_life"` → `"slice-of-life"` に修正 |
| INT conftest.py | `INSERT INTO novels (..., description, ...)` | カラム名は `synopsis` | `description` → `synopsis` に修正 |
| INT conftest.py | `'ongoing'` | CHECK: `'active', 'paused', 'completed'` | `'ongoing'` → `'active'` に修正 |
| INT conftest.py | `INSERT INTO chapters (novel_id, ...)` | FK カラムは `novel_slug` (VARCHAR) | `novel_id` → `novel_slug` に修正、値を slug 文字列に変更 |
| UT-001 `NOVEL_FIXTURES` | `author`, `tags`, `characters` 等のカラムなし | DB スキーマに `author`, `tags`, `synopsis`, `characters` 等が NOT NULL | 必須カラムを全てフィクスチャに含める |

---

#### C-02: 章レベル全文検索の API 未定義（DR-G2-01）

**対象ファイル**: 02-screen-spec.md / 04-external-design.md

画面仕様書 SCR-007 では検索結果に「小説タブ」と「章タブ」があり、`ChapterSearchCard` で章単位の検索結果（章タイトル + 抜粋テキスト + ハイライト）を表示する設計になっている。

しかし、外部設計書の `GET /api/novels/search` は小説レベルの結果（`slug`, `title`, `match_type`）のみを返却し、章レベルの検索結果を返す API が存在しない。

**修正方針**（いずれかを選択）:
- A) API レスポンスに `chapter_matches` 配列を追加し、章タイトル・抜粋・ハイライト位置を返却する
- B) 画面仕様書から章タブを削除し、小説レベルの検索のみにスコープを縮小する

---

#### C-03: テスト仕様のテーブル名参照誤り（DR-G2-06）

**対象ファイル**: 08-integration-test-spec.md

| 箇所 | 誤り | 正しい値 |
|------|------|---------|
| INT-007-01 実装例 | `SELECT COUNT(*) FROM analytics` | `pageviews`（04-external-design.md §2.6） |
| INT-007-02 説明 | `analytics テーブルに3件記録` | `pageviews テーブルに3件記録` |

---

#### C-04: ブックマーク API のエンドポイント設計が3ドキュメント間で矛盾（DR-G2-06）

**対象ファイル**: 02-screen-spec.md / 04-external-design.md / 07-unit-test-spec.md / 08-integration-test-spec.md

ブックマーク関連 API の契約が各ドキュメントで異なっており、実装者が混乱する。

| 操作 | 02-screen-spec.md | 04-external-design.md | 07/08-test-spec |
|------|-------------------|----------------------|----------------|
| 取得 | `GET /api/bookmarks/{session_id}` | `GET /api/bookmarks` + `X-Session-ID` ヘッダー | `GET /api/bookmarks?session_id=xxx` クエリパラメータ |
| 削除 | `DELETE /api/bookmarks/{session_id}/{novel_slug}` | `DELETE /api/bookmarks/{novel_slug}` + `X-Session-ID` ヘッダー | `DELETE /api/bookmarks/{id}` (ID ベース) |
| 作成 | body に `session_id` を含む | `X-Session-ID` ヘッダー | body に `session_id` を含む |

**修正方針**: 04-external-design.md の `X-Session-ID` ヘッダー方式を正とし、02-screen-spec.md と 07/08-test-spec の記述を統一する。X-Session-ID ヘッダー方式が最もセキュアかつ RESTful。

---

### Major（修正推奨）

#### M-01: 検索 API レスポンスキー名の不整合（DR-G2-06）

**対象ファイル**: 04-external-design.md / 07-unit-test-spec.md / 08-integration-test-spec.md

| ドキュメント | レスポンスキー |
|------------|--------------|
| 04-external-design.md | `items` |
| 07-unit-test-spec.md UT-004 | `results` |
| 08-integration-test-spec.md INT-004 | `results` |

04-external-design.md の `items` に統一すべき。

---

#### M-02: フロントエンド API クライアントのファイル名不整合（DR-G2-06）

| ドキュメント | ファイル名 |
|------------|-----------|
| 02-screen-spec.md 変更ファイル一覧 | `lib/api-client.ts` |
| 05-internal-design.md §6 | `lib/api.ts` |
| 07-unit-test-spec.md vitest config | `lib/api-client/**` |

1つに統一すること。内部設計の `lib/api.ts` が最もシンプル。

---

#### M-03: `reading_progress` テーブルに対応する API エンドポイントが未定義（DR-G2-01）

04-external-design.md §2.7 に `reading_progress` テーブルが定義されているが、REST API に対応するエンドポイント（GET/POST/PUT）がない。画面仕様書では「読書進捗: localStorage は維持」と記載されており、テーブルの用途が不明。

**修正方針**: Phase 2 で使用しないならテーブル定義を削除、Phase 3 で使用するなら備考に明記。

---

#### M-04: session_id の localStorage キー名不整合（DR-G2-06）

| ドキュメント | localStorage キー |
|------------|------------------|
| 02-screen-spec.md §セッションID管理 | `ai-novels-session-id` |
| 05-internal-design.md lib/api.ts | `session_id` |

`ai-novels-session-id`（名前空間付き）に統一すべき。

---

#### M-05: テストディレクトリ構造と実装構造の不整合（DR-G2-06）

| ドキュメント | API ディレクトリ | テストパス |
|------------|----------------|----------|
| 05-internal-design.md | `api/` | — |
| 04-external-design.md docker-compose | `./api` (build context) | — |
| 06-test-design.md | — | `cd backend`, `backend/tests/` |
| 08-integration-test-spec.md conftest | — | `from app.main import app` |

`api/` と `backend/` が混在。05-internal-design.md の `api/` に統一し、テスト仕様のパスも `api/tests/` に修正すべき。
また、conftest.py の `from app.main import app` は `from main import app` が正しい（05-internal-design.md のプロジェクト構造参照）。

---

#### M-06: PV 記録 API のバリデーション矛盾（DR-G2-02）

| ドキュメント | 記述 |
|------------|------|
| 04-external-design.md §3.10 | `session_id` が不正値の場合「サーバー側で採番（エラーにしない）」 |
| 07-unit-test-spec.md UT-008-03 | `novel_slug` 不正時に `status=404` を期待 |

しかし `pageviews` テーブルには `novel_slug` の FK 制約がない（04-external-design.md §2.6）。FK なしで 404 を返すには service レイヤーで novels テーブルの存在確認が必要。この設計判断を明記すべき。

---

### Minor（改善提案）

#### m-01: SQLAlchemy モデルの `datetime.utcnow` 非推奨

05-internal-design.md の SQLAlchemy モデルで `datetime.datetime.utcnow` を使用しているが、Python 3.12 で非推奨。`datetime.datetime.now(datetime.UTC)` に変更推奨。

#### m-02: API コンテナのメモリ制限が docker-compose.yml に未反映

04-external-design.md §6.3 で api コンテナ 256MB 制限を記載しているが、docker-compose.yml 差分に `deploy.resources.limits` が含まれていない。

#### m-03: レート制限の未記載

認証なしの公開 API にレート制限の記載がない。Phase 2 スコープ外とするなら「Phase 3 で対応」と明記し、リスク評価に追加することを推奨。

#### m-04: `idx_novels_status` インデックスが Alembic マイグレーションから欠落

DDL（§2.2）には `CREATE INDEX idx_novels_status ON novels (status)` があるが、05-internal-design.md §5.3 の Alembic マイグレーション `upgrade()` のインデックス作成リストに含まれていない。

#### m-05: 03 番ドキュメントの欠番

SDD ファイルが 01 → 02 → 04 と番号が飛んでおり、`03-*.md` が存在しない。番号体系を整理するか、欠番理由を記載することを推奨。

---

## AC テスタビリティ検証

| AC-ID | AC 条件 | 具体性 | テスト対応 | 判定 |
|-------|---------|--------|----------|------|
| AC-001 | GET /api/novels が 3 作品を返却 | ✅ 数値明確 | INT-001-01 | OK |
| AC-002 | GET /api/novels/stellar-drift/chapters/1 が章本文を返す | ✅ 具体的 | INT-003-01 | OK |
| AC-003 | ブックマーク保存・取得が API 経由で動作 | ✅ | INT-005, INT-006 | OK |
| AC-004 | PV 記録が DB に永続化 | ✅ | INT-007-01 | OK（テーブル名修正要: C-03） |
| AC-005 | 「魔法」検索で魔法学園が見つかる | ✅ 具体的 | INT-004-01, E2E-103-01 | OK |
| AC-006 | 既存フロントエンド全画面正常表示 | ✅ | E2E-105-01〜05 | OK |
| AC-007 | Docker Compose up で全サービス起動 | ✅ | 手動確認 | OK |
| AC-008 | http://localhost:3600 でアクセス可能 | ✅ | E2E-101 | OK |

---

## 結論

SDD 全体の設計品質は高く、要件定義・画面仕様・API/DB設計・テスト設計の各ドキュメントが網羅的に記述されている。セキュリティ設計（入力値サニタイズ方針 §5.1）も詳細で、DR-G2-03 の基準を十分に満たしている。

ただし、**複数担当者（Director/Designer/System Engineer/QA Engineer）間でのカラム名・API契約・テーブル名の不整合**が複数箇所で発生しており、これは DR-G2-02（SDD 内部矛盾チェック）の典型的な指摘パターンに該当する。

**実装フェーズに進むための条件**:
1. C-01〜C-04 の Critical 指摘を全て修正すること
2. 修正後、04-external-design.md を正（Single Source of Truth）として全ドキュメントの整合性を確保すること
3. M-01〜M-06 は実装開始前に解消を強く推奨（実装中の混乱を防止）
