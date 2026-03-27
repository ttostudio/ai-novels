# CHANGELOG — #26 読者分析ダッシュボード

## [1.0.0] - 2026-03-27

### Added
- `/analytics` 読者分析ダッシュボードページを新規作成
- PVトラッキング（localStorage ベース、章ページ訪問時に自動記録）
- 読了率トラッキング（IntersectionObserver でスクロール到達率計測）
- 人気作品ランキング（SVG縦棒グラフ）
- 読了率チャート（SVG横棒グラフ）
- アクセス推移グラフ（SVG折れ線グラフ）
- ChapterNavigation に次章プレビュー表示を追加
- Header に `/analytics` リンクを追加

### Backend
N/A — 本機能にバックエンド実装はありません（SSG + localStorage のみ）
