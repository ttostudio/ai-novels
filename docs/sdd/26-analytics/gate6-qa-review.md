---
issue: "#26"
version: "1.0"
author-role: QA Reviewer
gate: Gate-6
status: final
reviewed-at: 2026-03-27
---

# Gate 6: QA レビュー結果

**issue**: #26「読者分析ダッシュボード」
**レビュー実施日**: 2026-03-27
**担当**: QA Reviewer（QA Engineer とは独立）

---

## 総合判定

**判定: CONDITIONAL（条件付き合格）**

E2E テストは充実しており全 7 件 PASS かつブラウザ操作で実施されている点は評価できる。
ただし、以下 3 点の問題が確認されたため、修正完了後に再評価を要求する。

---

## レビュー詳細

### 1. Gate 5 レポートの虚偽記載（重大）

**問題**: Gate 5 レポートに「結合テストが実 localStorage を使用（モックなし）」とチェックされているが、実際の全テストファイルで `vi.fn()` ベースの `localStorageMock` を使用している。

**根拠（ファイル確認）**:

`useAnalytics.test.ts` L5〜L17:
```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    ...
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });
```

同じパターンが `useReadingProgress.test.ts` および `AnalyticsDashboard.test.tsx` でも使われており、3 ファイル全てで window.localStorage をモックオブジェクトに差し替えている。

**影響**: Gate 5 チェックリスト項目「結合テストが実 localStorage を使用（モックのみでない）」は事実として誤り。

**対応要求**: 以下いずれかの対応をすること。
1. jsdom 標準 localStorage（`localStorage.clear()` で初期化し `window.localStorage` 差し替えなし）に変更する
2. または Gate 5 レポートの記載を「localStorage モックを使用」に修正し、その代替として E2E での localStorage 検証をカバーとして明示する

---

### 2. ChapterNavigation 結合テスト（IT-10〜IT-13）が未実施（重大）

**問題**: テスト設計書 `06-test-design.md` に記載された以下のテストケースに対応するテストファイルが存在しない。

| ID | テストケース | 優先度 |
|----|------------|--------|
| IT-10 | 次章プレビュータイトルが表示される | 高 |
| IT-11 | 前章プレビュータイトルが表示される | 高 |
| IT-12 | 最終話では「最終話」テキストが表示される | 高 |
| IT-13 | 第1話では前章リンクが表示されない | 高 |

**根拠**: 設計書指定の `frontend/__tests__/components/ChapterNavigation.test.tsx` が存在しない。
E2E-05 で「第2話のタイトルが次章ボタンに表示される」は確認されているが、コンポーネント単体の境界値テスト（最終話・第1話の UI 制御）は E2E では未カバー。

**対応要求**: `ChapterNavigation.test.tsx` を作成し IT-10〜IT-13 を実施すること（優先度高のため省略不可）。

---

### 3. `useReadingProgress` ユニットテストの不足（中程度）

**問題**: テスト設計書の UT-11〜UT-13 に対応するテストが未実施。

| ID | テストケース | 実施状況 |
|----|------------|---------|
| UT-11 | ターゲット要素が viewport に入ると進捗が更新される | **未実施** |
| UT-12 | 100% 到達時に `isCompleted` が true になる | **未実施** |
| UT-13 | アンマウント時に IntersectionObserver が解除される | **未実施** |

**根拠**: `useReadingProgress.test.ts` に存在する 5 テストは、初期値・既存データ読み込み・endRef 存在確認・不正データ耐性のみ。IntersectionObserver のコールバック動作に関するテストが一切ない。

設計書で「IntersectionObserver のコールバックが jsdom 環境で実行できないため」と記載されているが、`vitest.setup.ts` で `global.IntersectionObserver` モックが定義されており、コールバックを `act()` 内で呼び出すことで UT-11〜UT-13 はテスト可能。

**影響**: `useReadingProgress.ts` のカバレッジが 46.9%（Branch: 27.3%）と目標 80% を大幅に下回る。E2E-04 で補完しているが、コールバック境界値の単体テストは E2E で網羅できない。

**対応要求**: UT-11〜UT-13 を `useReadingProgress.test.ts` に追加すること。

---

## テスト網羅性マトリクス

| ID | テストケース | 設計書記載ファイル | 実施状況 |
|----|------------|------------------|---------|
| UT-01 | PV 記録 | useAnalytics.test.ts | ✅ PASS |
| UT-02 | 同一章の重複 PV 加算 | useAnalytics.test.ts | ✅ PASS |
| UT-03 | 異なる章の独立記録 | useAnalytics.test.ts | △ 間接カバー（UT-04と合算） |
| UT-04 | getPageViews() 集計 | useAnalytics.test.ts | ✅ PASS |
| UT-05 | localStorage 破損時の例外なし | useAnalytics.test.ts | ⚠️ 別観点（入力バリデーション）でカバー |
| UT-06 | SSR 環境での非実行 | useAnalytics.test.ts | ❌ **未実施** |
| UT-10 | 初期値 readPercent=0 | useReadingProgress.test.ts | ✅ PASS |
| UT-11 | viewport 進入で進捗更新 | useReadingProgress.test.ts | ❌ **未実施** |
| UT-12 | 100% 到達で isCompleted=true | useReadingProgress.test.ts | ❌ **未実施** |
| UT-13 | アンマウントで disconnect | useReadingProgress.test.ts | ❌ **未実施** |
| UT-14 | IntersectionObserver 未対応環境 | useReadingProgress.test.ts | ✅ PASS（間接） |
| IT-01 | データなし表示 | pages/analytics.test.tsx | ✅ AnalyticsDashboard.test.tsx でカバー |
| IT-02 | PV 記録済み → 表示 | pages/analytics.test.tsx | ✅ AnalyticsDashboard.test.tsx でカバー |
| IT-03 | 複数小説 PV 降順 | pages/analytics.test.tsx | ✅ useAnalytics.test.ts でカバー |
| IT-04 | 読了率データ表示 | pages/analytics.test.tsx | ✅ AnalyticsDashboard.test.tsx でカバー |
| IT-05 | リロード後のデータ再取得 | pages/analytics.test.tsx | ❌ **未実施** |
| IT-06 | 不正データ混在でも表示 | pages/analytics.test.tsx | ✅ 各 test ファイルでカバー |
| IT-10 | 次章プレビュータイトル表示 | ChapterNavigation.test.tsx | ❌ **未実施** |
| IT-11 | 前章プレビュータイトル表示 | ChapterNavigation.test.tsx | ❌ **未実施** |
| IT-12 | 最終話表示制御 | ChapterNavigation.test.tsx | ❌ **未実施** |
| IT-13 | 第1話で前章リンクなし | ChapterNavigation.test.tsx | ❌ **未実施** |
| E2E-01〜E2E-07 | E2E フロー全件 | analytics-flow.spec.ts | ✅ 全件 PASS |

---

## E2E テストの評価（良好）

E2E テストについては以下を確認し、**問題なし**と判定する。

- `analytics-flow.spec.ts` が存在し、7 件全てのテストケースが実装されている
- Playwright + Chromium による実ブラウザ操作で実施（jsdom ではない）
- `localStorage.clear()` による事前クリーンアップが適切に実施されている
- `page.waitForLoadState("networkidle")` による確実な完了待機
- OBS-01 の aria-label ロケーター修正が適切（SVG 内数値との誤マッチを回避）
- E2E-03 の 3 回ループ訪問テストは実際のブラウザでの累積動作を確認できている

---

## カバレッジ評価

| ファイル | Stmts | Branch | 合否 |
|---------|-------|--------|------|
| useAnalytics.ts | 95.5% | 93.9% | ✅ |
| useReadingProgress.ts | 46.9% | 27.3% | ❌（目標 80% 未達） |
| components/analytics | 90% | 72.7% | ✅ |
| **All files** | **79.82%** | **73.1%** | ⚠️（80% わずか未達） |

`useReadingProgress.ts` の低カバレッジは UT-11〜UT-13 の未実施が主因。E2E-04 で E2E 補完されているが、Branch カバレッジ 27.3% は設計書の「カバレッジ目標 80%+」に対して許容できない水準。

---

## 修正要件（CONDITIONAL 解除条件）

以下 3 点が完了した後、QA Reviewer による再確認を経て PASS 判定に移行する。

| 優先度 | 内容 |
|-------|------|
| 高 | Gate 5 レポートの localStorage モック記載の訂正（または実 localStorage への変更） |
| 高 | `ChapterNavigation.test.tsx` の作成と IT-10〜IT-13 の実施 |
| 中 | `useReadingProgress.test.ts` に UT-11〜UT-13 を追加し Branch カバレッジ 50% 以上まで改善 |

---

## 所見

本機能（読者分析ダッシュボード）は localStorage のみを扱うクライアントサイド実装であり、DB 接続がないという特性上、結合テストが「localStorage レベルの統合」に限定されることは理解できる。

しかし、Gate 5 レポートの「実 localStorage を使用（モックなし）」という記載は実コードと乖離しており、品質ドキュメントとしての信頼性を損なう。記載の正確性は今後の Gate レビューにおける基準としても重要であるため、訂正を求める。

E2E テストの充実度（7 件、Playwright Chromium、実ブラウザ）は high quality であり、主要ユーザーフローは確実に検証されている。修正点が軽微であれば早期の PASS 移行が期待できる。
