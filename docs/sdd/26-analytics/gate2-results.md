---
issue: "#26"
version: "1.0"
reviewer-role: Design Reviewer
gate: Gate-2
status: conditional-pass
reviewed-at: 2026-03-27
---

# Gate 2 設計レビュー結果 — 読者分析ダッシュボード (#26)

## 判定: **CONDITIONAL PASS**

Critical 指摘 3 件を修正後、実装フェーズへ進むこと。
Major 指摘 4 件は修正推奨（実装開始前に対応すること）。

---

## 指摘事項

### Critical（実装前に必須修正）

#### [DR-G2-C01] localStorage キー名が 3 ドキュメント間で不統一

| ドキュメント | キー名 |
|---|---|
| 要件定義書（AC-001/002） | `pv_{novelSlug}_{chapter}` / `read_{novelSlug}_{chapter}` |
| 内部設計書 | `ai-novels:pv` / `ai-novels:reading-progress` |
| テスト設計書（UT-01, E2E-01） | `ai-novels-pv` |
| テスト設計書（テストデータ行65） | `ai-novels-analytics` |

同一機能のキーが 4 種類存在する。実装者によって異なるキーが使われると、ダッシュボードがデータを読み取れなくなる。

**修正方針**: 内部設計書の `ai-novels:pv` / `ai-novels:reading-progress` を正式定義として採用し、要件定義書・テスト設計書のキー名をそれに統一する。要件定義書 AC-001/002 の localStorage キー表記も更新すること。

---

#### [DR-G2-C02] ChapterNavigation の Props 定義が 3 ドキュメント間で不統一

| ドキュメント | Props 定義 |
|---|---|
| 画面仕様書（SCR-002） | `nextPreview: string \| undefined`（冒頭テキストのみ） |
| 内部設計書 | `nextChapter?: { title: string; previewText: string } \| null` |
| テスト設計書（IT-10） | `nextTitle="覚醒の時"` を使用（既存 prop 名） |
| 既存コード | `prevTitle?: string`, `nextTitle?: string`（title のみ） |

設計者によって異なる追加 Props が定義されている。実装担当者が混乱する。

**修正方針**: 内部設計書の `nextChapter?: { title: string; previewText: string } | null` を採用。画面仕様書の Props 表を更新。既存の `nextTitle` prop は残留するか削除するかを明示すること（`nextChapter.title` に一本化するなら既存 `nextTitle` の扱いを記載する）。テスト設計書の IT-10 も Props 定義変更に合わせて修正すること。

---

#### [DR-G2-C03] プレビューテキストの文字数制限が 3 ドキュメント間で不統一

| ドキュメント | 文字数 |
|---|---|
| 要件定義書（FR-006） | 最大 50 文字 |
| 要件定義書（AC-008） | 50 文字以内 |
| 画面仕様書（SCR-002 コンポーネント一覧） | 50〜80 字 |
| 内部設計書（ChapterNavigation Props） | content 先頭 100 文字 |

受け入れ条件（AC-008）でテスト基準値が「50 文字以内」とされているが、内部設計書では 100 文字を切り出すため、テストが仕様に対して 2 倍の文字数で合格判定してしまう。

**修正方針**: 1 つの数値に統一する。UI 表示サイズを考慮すると 50〜80 字が妥当。最終値を決定し、全ドキュメントで統一すること。

---

### Major（修正推奨）

#### [DR-G2-M01] 画面仕様書の「お気に入り数」カードと前週比バッジが FR 未定義

画面仕様書（SCR-001）には以下が含まれているが、要件定義書（FR-001〜FR-010）に対応する要件が存在しない。

- 概要カード 3 列目「お気に入り数」
- 全カードの「前週比バッジ」（▲+12% / ▼-3%）
- 期間別フィルタリング（日別 PV の日付付き集計）

内部設計書の型定義（`NovelAnalyticsSummary`）にも `favorites` / `previousWeekViews` フィールドがなく、データ取得経路が存在しない。localStorage にはお気に入り情報も日付別集計も保存されない設計のため、画面仕様書の通りに実装することが不可能。

**修正方針**: 以下のいずれかを選択し、全ドキュメントに反映する。
- (a) お気に入り数・前週比を今回スコープから除外し、画面仕様書から削除する
- (b) お気に入りトラッキング・日別 PV 記録の要件と localStorage スキーマを追加する

---

#### [DR-G2-M02] 期間セレクター（7日/30日/90日）が FR 未定義

画面仕様書では期間セレクターによる表示切り替えが定義されているが（インタラクション表：「期間セレクター変更 → グラフ・カード数値を選択期間でフィルタリング」）、要件定義書に対応する FR がない。

現在の内部設計書の `lastViewed` フィールドで期間フィルタリングは技術的に可能だが、日別集計ロジックが未設計。`NovelAnalyticsSummary` に日別データも含まれていない。

**修正方針**: 期間セレクターを今回スコープから除外するか、FR を追加して内部設計書の集計ロジックを補完すること。

---

#### [DR-G2-M03] 要件定義書の novelSlug 例が既存コードと不一致

要件定義書（用語定義）の例:
```
novelSlug 例: seiryu-hyoryu, mahou-gakuen, nichijou-sahanaji
```

既存コード（`lib/data.ts`）の実際の slug:
```
stellar-drift, magic-academy, daily-life
```

要件定義書のみを参照した実装者が誤った slug でキー構築を行うリスクがある。セキュリティ設計書のキー検証例（`/^[a-z0-9-]+$/.test(slug)`）が機能していても、誤 slug ではデータが空になる。

**修正方針**: 要件定義書の用語定義を実際の slug（`stellar-drift`, `magic-academy`, `daily-life`）に修正する。

---

#### [DR-G2-M04] 内部設計コンポーネント一覧と画面仕様のコンポーネント構成が不一致

画面仕様書（SCR-001）で定義されているコンポーネント:
- アクセス推移グラフ（折れ線 SVG）
- PVランキング（縦棒 SVG）
- 読了率チャート（横棒 SVG）

内部設計書で定義されているコンポーネント:
- `NovelRankingCard.tsx`（PVランキングに相当？）
- `ChapterViewsTable.tsx`（テーブル表示、グラフではない）
- `ReadingProgressList.tsx`（リスト表示、グラフではない）
- `StatsSummaryBar.tsx`

対応関係が不明確。特に画面仕様書の折れ線グラフに対応するコンポーネントが内部設計に存在しない。また `ChapterViewsTable` と `ReadingProgressList` は SVG グラフではなくテーブル/リストコンポーネントとして命名されており、SVG チャート実装ガイドラインと齟齬がある。

**修正方針**: 内部設計書のコンポーネント一覧を画面仕様書と照合し、対応表を作成するか、コンポーネント名を統一すること。

---

### Minor（軽微な修正）

#### [DR-G2-m01] テスト設計書のテストデータにキー名誤記

テスト設計書（テストデータ表 65 行目）:
```javascript
localStorage.setItem('ai-novels-analytics', '{invalid')
```

正しいキー（内部設計書準拠）は `ai-novels:pv` または `ai-novels:reading-progress`。
誤ったキーへの不正データ注入では FR-003/NFR-002 のエラーハンドリングをテストできない。

**修正方針**: 正しいキー名に修正する。

---

#### [DR-G2-m02] `useReadingProgress` の `readPercent` 算出が二重実装になる可能性

内部設計書（05-internal-design.md）の `useReadingProgress` 処理フロー:
> `ReadingProgressBar` と同様に scroll イベントで readPercent を算出

`ReadingProgressBar` が既存実装として存在する場合、スクロール率計算ロジックが 2 か所に重複する。再利用できるなら共通化すること。既存実装がなければ記述を削除する。

---

#### [DR-G2-m03] テスト設計書の `useAnalytics` フック設計との乖離

テスト設計書 UT-04: `getPageViews()` の呼び出しを想定しているが、内部設計書の `useAnalytics` フックには `getPageViews()` 関数が定義されていない（`getNovelSummaries()` / `getChapterDetails()` のみ）。

**修正方針**: テストケース UT-04 の関数名を内部設計書の定義（`getNovelSummaries`）に合わせて修正する。

---

## 良い点

1. **セキュリティ設計の充実**: `isSafeSlug()` / `isSafeChapterNumber()` によるキー検証例が明示されており、オブジェクトキーインジェクション対策が具体的に設計されている（NFR-002 に対応）
2. **エラーハンドリングの網羅性**: localStorage 読み取り失敗・書き込み失敗・JSON パース失敗・SSR 環境の 4 ケースが全て設計されており、ユーザー操作をブロックしない方針が一貫している
3. **アクセシビリティの詳細**: `aria-label` の具体的な形式、SVG の `<title>` + `<desc>` 要件、コントラスト比の実測値（13.6:1, 4.8:1, 4.6:1）が記載されており、WCAG AA 準拠の検証が可能
4. **デザイントークンの整合**: 画面仕様書の CSS 変数（`--bg`, `--text`, `--accent`, `--border`, `--panel`, `--muted`, `--font-reading`, `--font-ui`, `--max-width-content`）は全て `globals.css` の定義と一致している（DR-G2-01 チェック: 合格）
5. **テスト戦略の適切性**: IntersectionObserver のモック戦略（jsdom 対応のため完全モック化、挙動確認は E2E に委ねる）が合理的。`vitest.setup.ts` の `beforeEach(() => localStorage.clear())` でテスト間の独立性が担保されている
6. **SSR 対策の明示**: `typeof window === 'undefined'` チェックが設計書レベルで明示されており、Next.js App Router における共通の落とし穴が設計時点で識別されている
7. **ロールバック方針の具体性**: `git revert` + `docker compose up -d --build frontend` + `localStorage > Clear Site Data` の手順が具体的に記載されており、障害対応が明確

---

## 修正指示サマリー

| 優先度 | ID | 対象ドキュメント | 修正内容 |
|--------|-----|-----------------|---------|
| Critical | DR-G2-C01 | 01, 05, 06 | localStorage キー名を `ai-novels:pv` / `ai-novels:reading-progress` に統一 |
| Critical | DR-G2-C02 | 02, 05, 06 | ChapterNavigation Props を `nextChapter?: { title, previewText }` に統一 |
| Critical | DR-G2-C03 | 01, 02, 05 | プレビューテキスト文字数制限を統一（推奨: 50〜80字） |
| Major | DR-G2-M01 | 01, 02, 05 | お気に入り数・前週比を除外するかスコープ追加するか決定 |
| Major | DR-G2-M02 | 01, 02, 05 | 期間セレクターをスコープ除外するか FR 追加するか決定 |
| Major | DR-G2-M03 | 01 | novelSlug 例を実際のコード値に修正 |
| Major | DR-G2-M04 | 02, 05 | コンポーネント一覧の対応関係を整合 |
| Minor | DR-G2-m01 | 06 | テストデータのキー名を正しい値に修正 |
| Minor | DR-G2-m02 | 05 | ReadingProgressBar との重複実装を整理 |
| Minor | DR-G2-m03 | 06 | UT-04 の関数名を `getNovelSummaries` に修正 |

---

*Design Reviewer による独立レビュー。Director / Designer / System Engineer が作成したドキュメントを独立した立場で検証した。*
