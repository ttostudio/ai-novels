# Gate 4: コードレビュー — AI Novels Phase 2

- **レビュアー**: Code Reviewer (独立エージェント)
- **日時**: 2026-03-28
- **対象**: Backend (feature/phase2-backend), Frontend (feature/phase2-frontend)
- **判定**: **Conditional Pass（条件付き合格）** — Critical 1件 + Major 6件の修正後マージ可

---

## サマリー

| カテゴリ | Critical | Major | Minor | Info | Pass |
|----------|----------|-------|-------|------|------|
| セキュリティ (CR-G4-03) | 0 | 1 | 0 | 0 | ✅ (Frontend) |
| SDD準拠 (CR-G4-01) | 0 | 2 | 0 | 0 | — |
| コード品質 (CR-G4-02) | 0 | 2 | 10+ | 0 | — |
| パフォーマンス (CR-G4-04) | 0 | 1 | 0 | 0 | — |
| エラーハンドリング (CR-G4-05) | 1 | 1 | 0 | 0 | — |
| **合計** | **1** | **7** | **10+** | **2** | — |

---

## Critical（マージブロッカー）

### BE-C01: BackgroundTask でのセッションリーク
- **ファイル**: `api/routers/analytics.py` L11-19
- **カテゴリ**: エラーハンドリング (CR-G4-05)
- **内容**: `BackgroundTasks` に渡される DB セッションは、リクエスト完了時に `get_db()` の `finally` で close される。BackgroundTask 実行時にはセッションが既に閉じており、ランタイムエラーが発生する。
- **修正案**: BackgroundTask 内で独自のセッションを生成する（`SessionLocal()` を直接呼び出し）か、セッションのライフサイクルを BackgroundTask 側で管理する。

---

## Major（マージ前修正推奨）

### BE-M01: CORS 設定の過剰許可
- **ファイル**: `api/main.py` L9
- **カテゴリ**: セキュリティ (CR-G4-03)
- **内容**: `allow_origins=["*"]` と `allow_credentials=True` の組み合わせはブラウザによっては無視されるが、セキュリティポリシーとして不適切。
- **修正案**: `allow_origins` を明示的にフロントエンドの URL（`http://localhost:3000` 等）に限定する。

### BE-M02: ヘルスエンドポイントの SDD 乖離
- **ファイル**: `api/main.py` L21
- **カテゴリ**: SDD準拠 (CR-G4-01)
- **内容**: SDD では `GET /api/health` だが、実装は `/health`。API プレフィックスが欠落。
- **修正案**: パスを `/api/health` に変更、または router prefix で吸収。

### BE-M03: 検索サービスのインメモリ結合・ページネーション
- **ファイル**: `api/services/search_service.py` L11-52
- **カテゴリ**: パフォーマンス (CR-G4-04)
- **内容**: 小説とチャプターを別クエリで取得し Python 側で結合・ページネーション。データ量増加時にメモリ圧迫とレスポンス劣化のリスク。
- **修正案**: SQL UNION または単一クエリで結合し、DB 側で LIMIT/OFFSET を適用する。

### FE-M01: トップページ・ジャンルページの API エラーハンドリング欠如
- **ファイル**: `frontend/app/page.tsx` L16, `frontend/app/genre/[genre]/page.tsx` L29
- **カテゴリ**: エラーハンドリング (CR-G4-05)
- **内容**: `fetchNovels()` が失敗した場合のエラーハンドリングがなく、ページがクラッシュする。
- **修正案**: try-catch で囲み、エラー時はフォールバック UI を表示。

### FE-M02: アナリティクスが localStorage 参照のまま（SDD 乖離）
- **ファイル**: `frontend/hooks/useAnalytics.ts` L115-231
- **カテゴリ**: SDD準拠 (CR-G4-01)
- **内容**: SDD では `GET /api/analytics/dashboard` から取得する設計だが、実装は localStorage からの読み取りのまま。`lib/api.ts` L267 に `fetchAnalytics()` が定義済みだが未使用。
- **修正案**: `useAnalytics` を API 呼び出しに切り替える。

### FE-M03: Header 内の検索フォーム重複
- **ファイル**: `frontend/components/layout/Header.tsx` L59-81, L153-170
- **カテゴリ**: コード品質 (CR-G4-02)
- **内容**: デスクトップ用とモバイル用で検索フォームが重複定義されており、モバイル表示時に両方表示される機能バグの可能性あり。
- **修正案**: 共通の SearchForm コンポーネントに抽出し、表示制御を CSS で行う。

### BE-M04: SLUG_PATTERN の DRY 違反
- **ファイル**: `api/schemas/novel.py` L5, `api/schemas/analytics.py` L5, `api/services/novel_service.py` L8, `api/services/bookmark_service.py` L8
- **カテゴリ**: コード品質 (CR-G4-02)
- **内容**: 同一の正規表現パターンが 4 ファイルに重複定義。
- **修正案**: `api/constants.py` 等に一元管理する。

---

## Minor（修正推奨）

| ID | ファイル | 内容 | カテゴリ |
|----|----------|------|----------|
| BE-m01 | `api/models/novel.py` L19,22 | Column default に mutable `[]` を使用。`default_factory=list` に変更 | 品質 |
| BE-m02 | `api/services/generate_service.py` 全体 | スタブのみで実装なし。Phase 2 スコープ外なら TODO コメントを明記 | SDD |
| BE-m03 | 全 API モジュール | `import logging` が未使用。運用時のデバッグが困難 | 品質 |
| FE-m01 | `frontend/lib/data.ts` | JSON インポートのデッドコード。削除推奨 | 品質 |
| FE-m02 | 複数コンポーネント | 一部に `any` 型が残存（型安全性） | 品質 |
| FE-m03 | `frontend/components/` | コンポーネント間で類似するフェッチロジックの重複 | 品質 |

---

## セキュリティチェック結果

| チェック項目 | Backend | Frontend |
|-------------|---------|----------|
| CR-S01: XSS 脆弱性 | N/A (API) | ✅ Pass（dangerouslySetInnerHTML 未使用、rehype-sanitize 使用） |
| CR-S02: DOM 直接操作 | N/A | ✅ Pass |
| SQLi（パラメータバインド） | ✅ Pass（SQLAlchemy ORM 使用） | N/A |
| 入力バリデーション | ✅ Pass（Pydantic スキーマ） | ✅ Pass（encodeURIComponent 使用） |
| パストラバーサル | ✅ Pass | N/A |

## プロセスチェック

| チェック項目 | 結果 |
|-------------|------|
| CR-P01: CHANGELOG.md | ⚠️ 未確認（別途確認要） |
| CR-P02: デバッグコード残存 | ✅ Pass（console.log/debugger なし） |

---

## 判定

**Conditional Pass（条件付き合格）**

- Critical 1件（BE-C01）は必ず修正すること
- Major 7件は可能な限りマージ前に対応
- Minor はマージ後の改善タスクとして管理可
- セキュリティ観点では重大な脆弱性なし
