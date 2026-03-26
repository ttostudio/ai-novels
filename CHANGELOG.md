# Changelog

## [0.2.0] - 2026-03-26

### Added
- 小説生成スクリプト (`scripts/generate-chapter.ts`) — Claude API (claude-sonnet-4-6) で3000〜5000文字の章を生成
- 挿絵生成スクリプト (`scripts/generate-illustration.ts`) — ComfyUI (Flux.1-schnell) で 1024x576 挿絵を生成
- 連載管理スクリプト (`scripts/generate-series.ts`) — テキスト+挿絵を一括生成し chapters JSON を自動更新
- ルート `package.json` + `@anthropic-ai/sdk` + `tsx` インストール
- Scheduler ジョブ (`novel-generation.job`) — 月曜6時に星間漂流、水曜6時に魔法学園クロニクルを自動生成

## [0.1.0] - 2026-03-26

### Added
- Next.js 15 App Router + TypeScript + Tailwind CSS プロジェクト初期セットアップ
- 5画面ルーティング実装
  - `/` — トップページ（注目作品カルーセル・ジャンルチップ・新着更新リスト）
  - `/novel/[slug]` — 作品詳細（あらすじ・登場人物・章一覧・挿絵ギャラリー）
  - `/novel/[slug]/[chapter]` — 閲覧ページ（本文Markdownレンダリング・前後章ナビ）
  - `/genre/[genre]` — ジャンル別作品一覧
  - `/bookmarks` — ブックマーク管理（localStorage永続化）
- セピア系デザイントークン（CSS変数）
  - `--bg: #faf9f7`, `--text: #2d2a26`, `--accent: #8b5e3c`, `--border: #e8e3dd`
- スタブデータ（3作品・各3章）
  - 星間漂流（SF）、魔法学園クロニクル（ファンタジー）、日常茶飯事（日常系）
- リーダー設定機能（フォントサイズ3段階・背景色3種・行間2段階）
- ブックマーク機能（localStorage）
- Docker Compose + Caddy リバースプロキシ（ポート 3600）
- レスポンシブ対応（モバイル・タブレット・デスクトップ）
- XSS対策（rehype-sanitize による Markdown サニタイズ）
