---
issue: "ttostudio/ttoClaw#25"
version: "1.0"
author-role: QA Engineer
gate: Gate-3
status: draft
---

# テスト設計書 — Phase 2: バックエンド構築・DB移行・API化

## 1. テスト戦略

### 1.1 概要

Phase 2 では静的 JSON + localStorage から FastAPI + PostgreSQL への移行を行う。
データ整合性・API 動作・既存フロントエンドの回帰防止を3層のテストで担保する。

```
┌─────────────────────────────────────────────────────┐
│  Layer 3: E2E テスト（Playwright）                   │
│  実ブラウザ + デプロイ済み環境                        │
│  - 既存画面の回帰確認                                 │
│  - ユーザーフロー（小説閲覧・検索・ブックマーク）      │
├─────────────────────────────────────────────────────┤
│  Layer 2: 結合テスト（pytest + 実 PostgreSQL）        │
│  実 DB 接続必須（モックのみ不可）                     │
│  - 全 API エンドポイント                              │
│  - DB CRUD 整合性                                    │
│  - データ移行スクリプト検証                           │
├─────────────────────────────────────────────────────┤
│  Layer 1: ユニットテスト（pytest / vitest）           │
│  関数・コンポーネント単体                             │
│  - APIルート関数（ロジック分離部分）                  │
│  - フロントエンド APIクライアント・コンポーネント      │
└─────────────────────────────────────────────────────┘
```

### 1.2 テストフレームワーク

| レイヤー | フレームワーク | 実行環境 |
|---------|--------------|---------|
| バックエンド UT | pytest | Docker コンテナ / ローカル |
| フロントエンド UT | vitest + @testing-library/react | ローカル（jsdom） |
| 結合テスト | pytest + psycopg2/asyncpg | Docker PostgreSQL（テスト用DB） |
| E2E テスト | Playwright | デプロイ済み環境（http://localhost:3600） |

---

## 2. テスト環境

### 2.1 バックエンド・結合テスト環境

```yaml
# docker-compose.test.yml（テスト専用）
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ai_novels_test
      POSTGRES_USER: novels_user
      POSTGRES_PASSWORD: novels_pass
    ports:
      - "5433:5432"   # 本番 5432 と競合しないよう別ポート
    tmpfs:
      - /var/lib/postgresql/data  # テスト後クリーン
```

**接続文字列（テスト用）:**
```
DATABASE_URL=postgresql://novels_user:novels_pass@localhost:5433/ai_novels_test
```

### 2.2 テスト DB ライフサイクル

```
テスト開始
  ↓
conftest.py: DB 作成 + Alembic マイグレーション適用
  ↓
conftest.py: フィクスチャデータ挿入（novels / chapters / bookmarks）
  ↓
各テスト実行（トランザクション内）
  ↓
テスト後: トランザクションロールバック（状態リセット）
  ↓
テスト終了: DB 削除
```

### 2.3 フロントエンド UT 環境

- vitest + jsdom（既存設定を継承）
- `vitest.config.ts` の `coverage.include` を拡張（`lib/**`, `components/**` 追加）
- テスト DB 不要（API クライアントは fetch モック）

### 2.4 E2E テスト環境

- デプロイ済みの `http://localhost:3600` を対象とする
- **実際の UI が存在する状態でのみ実行**（デプロイ前実行禁止）
- セレクタは実 UI の DOM 構造に合わせて記述（推測禁止）
- Playwright の `baseURL: 'http://localhost:3600'` を設定

---

## 3. カバレッジ目標

| 対象 | カバレッジ目標 | 計測方法 |
|-----|-------------|---------|
| バックエンド API 関数（pytest） | 80% 以上 | pytest-cov |
| フロントエンド APIクライアント（vitest） | 80% 以上 | @vitest/coverage-v8 |
| API エンドポイント（結合テスト） | 全エンドポイント網羅 | 手動チェックリスト |
| E2E ユーザーフロー | 主要フロー全件 | Playwright レポート |

---

## 4. 受入基準との対応

| AC-ID | テストレイヤー | テスト ID |
|-------|-------------|---------|
| AC-001 | 結合テスト | INT-001 |
| AC-002 | 結合テスト | INT-002 |
| AC-003 | 結合テスト | INT-005, INT-006 |
| AC-004 | 結合テスト | INT-007 |
| AC-005 | 結合テスト | INT-004 |
| AC-006 | E2E テスト | E2E-101〜E2E-106 |
| AC-007 | 手動確認 | — |
| AC-008 | E2E テスト | E2E-101 |

---

## 5. Music Station 教訓（必須反映事項）

| # | 前プロジェクトの問題 | Phase 2 での対策 |
|---|-------------------|----------------|
| 1 | モックのみテストで Gate 5 不合格 | 結合テストは実 PostgreSQL 必須。`docker-compose.test.yml` で専用 DB を起動。conftest.py でマイグレーション + シード実施 |
| 2 | E2E テストがデプロイ前に書かれセレクタ不一致 | E2E テストはバックエンド実装・フロントエンド接続切替・デプロイ完了後に実際の DOM を確認して記述する |
| 3 | テストフィクスチャのカラム名不一致 | フィクスチャは `04-db-schema.md`（または Alembic モデル）と完全一致させる。スキーマ変更時はフィクスチャも同期更新 |

---

## 6. テスト実行手順

### 6.1 ユニットテスト

```bash
# バックエンド（pytest）
cd backend
pip install -r requirements-dev.txt
pytest tests/unit/ -v --cov=app --cov-report=term-missing

# フロントエンド（vitest）
cd frontend
npm test
```

### 6.2 結合テスト

```bash
# テスト DB 起動
docker compose -f docker-compose.test.yml up -d postgres-test

# マイグレーション適用
DATABASE_URL=postgresql://novels_user:novels_pass@localhost:5433/ai_novels_test \
  alembic upgrade head

# 結合テスト実行
cd backend
DATABASE_URL=postgresql://novels_user:novels_pass@localhost:5433/ai_novels_test \
  pytest tests/integration/ -v

# クリーンアップ
docker compose -f docker-compose.test.yml down -v
```

### 6.3 E2E テスト（デプロイ後のみ実行）

```bash
# 前提: docker compose up -d でデプロイ済み、http://localhost:3600 が起動していること
cd frontend
npx playwright test e2e/phase2/ --reporter=html
```

---

## 7. Gate 5 チェックリスト（テスト実行時に記入）

- [ ] バックエンド UT 全件 PASS（pytest）
- [ ] フロントエンド UT 全件 PASS（vitest）
- [ ] 結合テスト（実 PostgreSQL 接続）全件 PASS
- [ ] E2E テスト全件 PASS（デプロイ済み環境）
- [ ] SKIP テストには理由を `@pytest.mark.skip(reason="...")` で明記
- [ ] カバレッジレポート取得済み（バックエンド・フロントエンド各 80%+）
- [ ] 既存 E2E テスト（analytics-flow.spec.ts）が回帰していないこと
