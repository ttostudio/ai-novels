---
issue: "#26"
version: "1.0"
author-role: Code Reviewer
gate: Gate-4
status: reviewed
reviewed-at: 2026-03-27
---

# Gate 4 コードレビュー結果 — #26 読者分析ダッシュボード

## 判定: CONDITIONAL

条件付き承認。Critical 指摘はなし。Major 2件の修正後にマージ可。

---

## 指摘事項

### Major（修正必須）

#### M01: getDailyPVTrend の集計ロジックが不正確
- **ファイル**: `/frontend/hooks/useAnalytics.ts` L185-203
- **観点**: CR-Q02（SDD仕様乖離）/ ロジック正確性
- **内容**: `getDailyPVTrend` は各章の `lastViewed` 日付をキーにその章の全 `views` をその日に割り当てている。しかし `lastViewed` は「最後に閲覧した日」であり、PV数は累積値である。例えば chapter 1 が 3/25 に 3PV、3/27 に 2PV 追加された場合、`lastViewed` は 3/27 になり views=5 が全て 3/27 に計上される。日別の正確なトレンドを出すには、PV記録時に日付ごとのカウントを別途保持するか、現在の実装制約（日付ではなく最終閲覧日の近似値であること）をUIに明示する必要がある。
- **修正案**: (a) アクセス推移グラフのタイトルを「最終閲覧日別PV（近似値）」等に変更してユーザーの誤解を防ぐ、または (b) PVStore に日付別カウント配列を追加する（スコープ拡大のため要検討）。最低限 (a) を実施すること。

#### M02: NovelRankingCard で DOM 直接操作（CR-S02 該当）
- **ファイル**: `/frontend/components/analytics/NovelRankingCard.tsx` L102-109
- **観点**: CR-S02（DOM直接操作）
- **内容**: `onMouseEnter` / `onMouseLeave` ハンドラで `previousElementSibling` を取得し `setAttribute("fill", ...)` で直接 DOM を操作している。React の宣言的レンダリングの原則に反し、DOM 構造変更時にバグの温床となる。
- **修正案**: 各バーの `fill` を `useState` または CSS `:hover` 疑似クラスで管理する。SVG 内でも CSS hover は有効。

---

### Minor（修正推奨）

#### m01: useReadingProgress と useAnalytics で localStorage 読み書きヘルパーが重複（CR-Q01: DRY違反）
- **ファイル**: `useAnalytics.ts` L76-85 / `useReadingProgress.ts` L13-30
- **観点**: CR-Q01（DRY違反）
- **内容**: `PROGRESS_KEY` の定数定義、`readStore()` / `writeStore()` のヘルパー関数が両ファイルで独立して重複定義されている。内部設計書（05-internal-design.md）のコンポーネント構成でも `useScrollPercent.ts` を共用フックとして分離する設計が示されているが、localStorage ヘルパーの共通化は実施されていない。
- **修正案**: `lib/storage.ts` 等に共通ヘルパーを抽出する。

#### m02: localStorage から読み込んだデータの構造バリデーション不足（CR-S01 関連）
- **ファイル**: `useAnalytics.ts` L51-59, L76-84 / `useReadingProgress.ts` L13-22
- **観点**: セキュリティ（NFR-002 準拠）、型安全性（CR-Q05）
- **内容**: `JSON.parse(raw) as PVStore` のように型アサーション（`as`）のみで実際の構造検証をしていない。内部設計書のセキュリティ設計では「TypeScript 型ガードまたは zod でバリデーション後に使用する」と記載されているが、実装では型アサーションのみ。悪意あるブラウザ拡張やdevtoolsによるlocalStorage改変時に、`entry.views` が数値でない場合に `NaN` が伝搬する可能性がある。
- **修正案**: 最低限 `typeof entry.views === 'number'` のガードを追加するか、zod スキーマでバリデーションする。

#### m03: SDD コンポーネント名と実装コンポーネント名の不一致（CR-Q02）
- **ファイル**: 内部設計書 vs 実装
- **観点**: CR-Q02（SDD仕様乖離）
- **内容**: 内部設計書では `SummaryCards.tsx` / `PVBarChart.tsx` / `ReadingProgressBarChart.tsx` / `EmptyState.tsx` と命名されているが、実装では `StatsSummaryBar.tsx` / `NovelRankingCard.tsx` / `ReadingProgressList.tsx` でありEmptyStateは `AnalyticsDashboardClient.tsx` にインライン実装されている。機能的には等価だが、設計と実装の対応関係が不明確。
- **修正案**: 内部設計書を実装に合わせて更新するか、ファイル名を設計に合わせる（設計書更新が現実的）。

#### m04: useScrollPercent の共用フック未実装（SDD DR-G2-m02 の設計指摘未対応）
- **ファイル**: `useReadingProgress.ts` L66-86
- **観点**: CR-Q02（SDD仕様乖離）
- **内容**: 内部設計書 v1.1 で「DR-G2-m02: `useScrollPercent` を `ReadingProgressBar` と共用する」と明記されているが、`useReadingProgress.ts` 内に `window.addEventListener("scroll", ...)` が直接実装されており、共用フックへの分離は行われていない。
- **修正案**: `useScrollPercent` フックを切り出して `ReadingProgressBar` と共用する。

#### m05: ReadingProgressList の desc テキストが不正確
- **ファイル**: `/frontend/components/analytics/ReadingProgressList.tsx` L35
- **観点**: アクセシビリティ
- **内容**: `<desc>` 内で読了率を `(d.completed ? 1 : 0) / 1 * 100` で計算しており、常に 0% か 100% しか表示されない。実際の `readPercent` 値を使うべき。

#### m06: ReadingProgressList の冗長な三項演算子
- **ファイル**: `/frontend/components/analytics/ReadingProgressList.tsx` L50-52
- **観点**: コード品質
- **内容**: `detail.completed ? detail.readPercent : detail.readPercent` は条件分岐の意味がない。両方とも同じ値を返している。
- **修正案**: `detail.views > 0 ? detail.readPercent : 0` に簡略化する。

---

## セキュリティチェック結果

| チェック項目 | 結果 | 備考 |
|---|---|---|
| CR-S01: XSS脆弱性 | OK | `dangerouslySetInnerHTML` / `innerHTML` 不使用。React の JSX テンプレートのみ使用。localStorage データも JSX 内でテキストノードとして表示 |
| CR-S02: DOM直接操作 | NG | NovelRankingCard.tsx L102-109 で `setAttribute` による直接操作あり（M02参照） |
| SSR保護 | OK | `typeof window === "undefined"` チェックが localStorage 読み書き関数に実装済み。全コンポーネントに `"use client"` ディレクティブあり |
| slugバリデーション | OK | `isSafeSlug` / `isSafeChapterNumber` でインジェクション防止済み |

## コード品質チェック結果

| チェック項目 | 結果 | 備考 |
|---|---|---|
| CR-Q01: DRY違反 | 軽微 | localStorage ヘルパーが2ファイルで重複（m01） |
| CR-Q02: SDD仕様乖離 | 軽微 | コンポーネント命名不一致（m03）、useScrollPercent 未分離（m04）、日別PVロジック（M01） |
| CR-Q03: カバレッジ | OK | hooks 2本 + ダッシュボードコンポーネントのテストが存在。主要パス網羅 |
| CR-Q05: 型安全性 | 軽微 | localStorage データに型アサーションのみ使用（m02） |

## プロセスチェック結果

| チェック項目 | 結果 | 備考 |
|---|---|---|
| CR-P01: CHANGELOG.md | OK | `docs/sdd/26-analytics/CHANGELOG.md` に変更内容が記載済み |
| CR-P02: デバッグコード残存 | OK | `console.log` / `console.debug` / `console.warn` / `console.error` の残存なし |

## テスト品質

| テストファイル | 評価 | 備考 |
|---|---|---|
| useAnalytics.test.ts | 良好 | 正常系（PVインクリメント、累積、集計降順）、異常系（不正slug、不正chapterNumber）をカバー |
| useReadingProgress.test.ts | 良好 | 初期状態、既存データ読込、壊れたJSON、endRef存在の基本テスト完備 |
| AnalyticsDashboard.test.tsx | 良好 | データなし表示、PVデータ表示、読了率表示の3シナリオ |
| （不足点） | — | スクロールイベント発火→readPercent更新→localStorage書き込みの統合テストがない。IntersectionObserverのモックテストもない |

---

## 良い点

1. **localStorage エラーハンドリングが堅実**: 全ての読み書きが try-catch で囲まれており、QuotaExceededError や JSON パースエラーでもクラッシュしない設計。NFR-003 要件を満たしている。

2. **SSR 安全性への配慮**: `typeof window === "undefined"` チェックが適切に配置され、`"use client"` ディレクティブも全クライアントコンポーネントに付与されている。

3. **アクセシビリティ対応が丁寧**: 全 SVG チャートに `role="img"`、`aria-label`、`<title>`、`<desc>` が付与されている。概要カードにも `aria-label` がある。WCAG 2.1 AA の基本要件を満たしている。

4. **入力値バリデーション**: `isSafeSlug` / `isSafeChapterNumber` による slug インジェクション防止が SDD 通りに実装されている。

5. **デバウンス実装**: `useReadingProgress` のスクロール永続化に 500ms デバウンスが実装され、パフォーマンス設計通り。

6. **テストの網羅性**: 正常系・異常系・境界値のテストケースが適切に設計されており、localStorage モックも正確に実装されている。

7. **次章プレビュー**: `ChapterPageClient.tsx` L43 でプレビューテキストが 80 文字制限で切り出されており、SDD FR-006 / AC-008 準拠。

8. **コンポーネント分割**: ダッシュボードが SSG ページ + クライアントコンポーネントに適切に分離されており、Next.js のベストプラクティスに沿っている。

---

## マージ条件

以下の修正完了を条件として PASS とする:

1. **M01**: アクセス推移グラフの表現を修正（タイトル変更 or ロジック修正）
2. **M02**: NovelRankingCard の DOM 直接操作を React 的な実装に変更

Minor 指摘（m01-m06）は次回サイクルでの対応でも可。
