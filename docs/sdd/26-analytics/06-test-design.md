---
issue: "#26"
version: "1.0"
author-role: QA Engineer
gate: Gate-1
status: draft
---

# テスト設計書

## テスト戦略

| レベル | ツール | 対象 | カバレッジ目標 |
|--------|--------|------|---------------|
| ユニットテスト | Vitest + @testing-library/react | Custom Hooks（useAnalytics, useReadingProgress） | 80%+ |
| 結合テスト | Vitest + @testing-library/react | ダッシュボードページ（実 localStorage 読み込み・表示） | 主要パス網羅 |
| E2E テスト | Playwright | 章ページ訪問 → PV 記録 → ダッシュボード表示確認 | AC 全件 |

> **注意**: 現 `package.json` にテストフレームワークが含まれていないため、以下のパッケージを追加する必要がある。
> - `vitest`, `@vitest/coverage-v8`
> - `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
> - `jsdom`（Vitest 環境用）
> - `@playwright/test`

---

## テスト範囲

### In（テスト対象）

- `useAnalytics` フック — localStorage への PV 記録・読み取りロジック
- `useReadingProgress` フック — IntersectionObserver を使った読了率計測ロジック
- `/analytics` ダッシュボードページ — localStorage データの集計・表示
- `ChapterNavigation` コンポーネント — 次章プレビュー表示の改善（`nextChapter` prop）
- 既存コンポーネントへの analytics フック統合（ChapterPageClient）

### Out（テスト対象外）

- SSG による静的ファイル生成（Next.js ビルドプロセス）— フレームワーク保証の範囲
- CSS スタイリング・デザイントークンの見た目検証 — デザインレビューで対応済み
- localStorage の容量超過時の挙動 — ブラウザ依存、QA 範囲外
- 外部 API 通信 — 本機能はクライアントサイドのみ

---

## テスト環境

| 項目 | 内容 |
|------|------|
| OS | macOS（CI: self-hosted runner） |
| ブラウザ | Chromium（Playwright）、jsdom（Vitest） |
| DB | なし（localStorage のみ） |
| モック対象 | IntersectionObserver（jsdom 未対応のため）、`window.scrollY`（ユニットテストのみ） |
| Next.js 起動 | E2E テスト時: `next build && next start`（Docker 上） |

---

## テストデータ

| データセット | 用途 | 準備方法 |
|-------------|------|----------|
| PV 記録データ（複数小説・複数章） | ダッシュボード集計確認 | テスト前に `localStorage.setItem` で直接注入 |
| 読了率データ（0%, 50%, 100%） | 読了率トラッキング確認 | IntersectionObserver モックで制御 |
| 空の localStorage | 初回訪問シナリオ | テスト毎に `localStorage.clear()` |
| 不正形式データ | エラーハンドリング確認 | `localStorage.setItem('ai-novels:reading-progress', '{invalid')` |

---

## テストケース一覧

### 1. ユニットテスト — `useAnalytics` フック

**ファイル**: `frontend/__tests__/hooks/useAnalytics.test.ts`

| ID | テストケース | 前提条件 | 期待結果 | 優先度 |
|----|------------|---------|---------|--------|
| UT-01 | PV を記録できる | localStorage 空 | `ai-novels:pv` キーに `{ novelSlug, chapterNumber, timestamp }` が保存される | 高 |
| UT-02 | 同一章の重複 PV は加算される | 同チャプターの PV が既存 | カウントが +1 される | 高 |
| UT-03 | 異なる章の PV が独立して記録される | 複数章の PV | 各チャプターのカウントが独立して管理される | 高 |
| UT-04 | `getPageViews()` が全 PV 集計を返す | 複数の PV 記録済み | 小説別・章別の集計オブジェクトを返す | 高 |
| UT-05 | localStorage が破損している場合に例外を投げない | 不正 JSON | エラーが発生せず空の集計を返す | 中 |
| UT-06 | SSR 環境（`window` undefined）で実行されない | サーバーサイド環境 | `useEffect` 内のみで実行され SSR でエラーが出ない | 中 |

### 2. ユニットテスト — `useReadingProgress` フック

**ファイル**: `frontend/__tests__/hooks/useReadingProgress.test.ts`

| ID | テストケース | 前提条件 | 期待結果 | 優先度 |
|----|------------|---------|---------|--------|
| UT-10 | 初期値は 0% | フック初期化直後 | `progress === 0` | 高 |
| UT-11 | ターゲット要素が viewport に入ると進捗が更新される | IntersectionObserver コールバック発火 | `progress` が 0 より大きくなる | 高 |
| UT-12 | 100% 到達時に `isCompleted` が true になる | 最後のセンサー要素が交差 | `isCompleted === true` | 高 |
| UT-13 | アンマウント時に IntersectionObserver が解除される | フックアンマウント | `observer.disconnect()` が呼ばれる | 中 |
| UT-14 | IntersectionObserver 未対応環境で例外を投げない | `IntersectionObserver` undefined | エラーなく `progress === 0` のまま | 中 |

### 3. 結合テスト — `/analytics` ダッシュボードページ

**ファイル**: `frontend/__tests__/pages/analytics.test.tsx`

| ID | テストケース | 前提条件 | 期待結果 | 優先度 |
|----|------------|---------|---------|--------|
| IT-01 | PV データなしの場合「データなし」メッセージが表示される | localStorage 空 | 「まだデータがありません」等のメッセージが表示される | 高 |
| IT-02 | PV 記録済みの場合、小説別 PV が表示される | localStorage に PV データ注入 | 小説タイトルと PV 数が表示される | 高 |
| IT-03 | 複数小説の PV が降順に表示される | 3 件の小説データ注入（PV 数異なる） | 最多 PV の小説が先頭に表示される | 高 |
| IT-04 | 読了率データが表示される | 読了率データ注入 | 章ごとの読了率（%）が表示される | 高 |
| IT-05 | ページをリロードしても localStorage からデータを再取得できる | データ注入後コンポーネント再マウント | データが消えずに表示される | 中 |
| IT-06 | 不正データが混在しても表示が壊れない | 一部不正 JSON を混入 | 正常なデータのみ表示、エラーなし | 中 |

### 4. 結合テスト — `ChapterNavigation` コンポーネント

**ファイル**: `frontend/__tests__/components/ChapterNavigation.test.tsx`

| ID | テストケース | 前提条件 | 期待結果 | 優先度 |
|----|------------|---------|---------|--------|
| IT-10 | 次章プレビュータイトルが表示される | `nextChapter="覚醒の時"` を props に渡す | 「覚醒の時」というテキストが次章リンク内に表示される | 高 |
| IT-11 | 前章プレビュータイトルが表示される | `prevTitle="出会いの朝"` を props に渡す | 「出会いの朝」というテキストが前章リンク内に表示される | 高 |
| IT-12 | 最終話では「最終話」テキストが表示される | `currentChapter === totalChapters` | 「最終話」が表示され次章リンクがない | 高 |
| IT-13 | 第1話では前章リンクが表示されない | `currentChapter === 1` | 前章ボタンが存在しない | 高 |

### 5. E2E テスト — 読者分析フロー

**ファイル**: `frontend/e2e/analytics-flow.spec.ts`

| ID | テストケース | 操作手順 | 期待結果 | 優先度 |
|----|------------|---------|---------|--------|
| E2E-01 | 章ページ訪問で PV が記録される | 1. `/novel/{slug}/1` にアクセス<br>2. ページ読み込み完了を待機<br>3. `localStorage` を確認 | `ai-novels:pv` に訪問記録が存在する | 高 |
| E2E-02 | ダッシュボードで PV が表示される | 1. 章ページを訪問（PV 記録）<br>2. `/analytics` にアクセス<br>3. 表示確認 | 訪問した小説の PV 数「1」が表示される | 高 |
| E2E-03 | 同章を複数回訪問するとカウントが増加する | 1. 同章ページを 3 回訪問<br>2. `/analytics` で確認 | PV 数「3」が表示される | 高 |
| E2E-04 | スクロールで読了率が更新される | 1. 章ページにアクセス<br>2. ページ末尾までスクロール<br>3. `/analytics` で読了率確認 | 読了率が 100% に近い値で表示される | 高 |
| E2E-05 | 次章プレビュータイトルが章ナビゲーションに表示される | 1. 第1話ページにアクセス<br>2. ChapterNavigation を確認 | 第2話のタイトルが次章ボタンに表示される | 高 |
| E2E-06 | 複数小説のダッシュボード集計が正しい | 1. 小説Aの章を2回、小説Bの章を1回訪問<br>2. `/analytics` で確認 | 小説Aが PV 2、小説Bが PV 1 で表示される | 中 |
| E2E-07 | localStorage がない状態でダッシュボードがクラッシュしない | 1. localStorage をクリア<br>2. `/analytics` にアクセス | ページが正常に表示される（データなしメッセージ） | 中 |

---

## リスクベーステスト

| リスク | 影響度 | テスト強化内容 |
|--------|--------|---------------|
| IntersectionObserver の jsdom 非対応 | 高 | ユニットテストでは完全モック化、挙動確認は E2E に委ねる |
| SSR 時の `window` / `localStorage` 参照エラー | 高 | UT-06 で `typeof window === 'undefined'` ガードを明示的に確認 |
| localStorage のストレージ形式変更によるデータ破損 | 高 | IT-06 で不正データ混在テストを実施 |
| Next.js 15 App Router での `"use client"` 指定漏れ | 中 | E2E テストで実際のブラウザ動作を確認 |
| PV 計測タイミング（ページ離脱前の未記録） | 中 | E2E-01 でページ読み込み完了後の記録確認を明示 |
| 複数タブ同時閲覧による localStorage 競合 | 低 | 現バージョンでは対象外（Out of Scope） |

---

## テスト実行計画

### セットアップ手順

```bash
# テストパッケージのインストール
cd frontend
npm install -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test

# Playwright ブラウザインストール
npx playwright install chromium
```

### `vitest.config.ts` 設定

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80 },
    },
  },
})
```

### `vitest.setup.ts` 設定

```ts
import '@testing-library/jest-dom'

// IntersectionObserver のモック
global.IntersectionObserver = class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

// localStorage のリセット
beforeEach(() => localStorage.clear())
```

### E2E テスト実行（Docker）

```bash
# Next.js ビルド & 起動
docker compose up -d frontend

# Playwright テスト実行
npx playwright test e2e/ --reporter=html
```

### CI 実行順序

1. `npm run lint`
2. `npx vitest run --coverage`（ユニット + 結合テスト）
3. `npx playwright test`（E2E テスト）

---

## 合否基準（Gate 5）

| 項目 | 基準 |
|------|------|
| ユニットテスト | 全件 PASS、カバレッジ 80% 以上 |
| 結合テスト | 主要パス（IT-01〜IT-06, IT-10〜IT-13）全 PASS |
| E2E テスト | 優先度「高」の全ケース（E2E-01〜05）PASS |
| skip テスト | 理由を `test.skip('理由: ...')` に明記すること |
