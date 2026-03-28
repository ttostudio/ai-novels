---
issue: "ttostudio/ttoClaw#25"
version: "1.0"
author-role: Director
gate: Gate-1
status: draft
---

# 要件定義書 — Phase 2: バックエンド構築・DB移行・API化

## 概要

AI Novels の静的 JSON + localStorage アーキテクチャをバックエンド API + PostgreSQL に移行し、
サーバーサイド永続化・連載スケジューラ・管理機能の基盤を構築する。

## 背景

Phase 1 で Next.js SSG フロントエンドを構築済みだが、全データが JSON ファイルと localStorage に
依存しており、マルチデバイス同期・管理・検索・スケジュール実行ができない。
プロダクションレベルの連載プラットフォームにはサーバーサイド API + DB が必須。

## 機能要件

| ID | 要件 | 優先度 | 備考 |
|----|------|--------|------|
| FR-001 | PostgreSQL スキーマ設計（novels, chapters, illustrations, bookmarks, analytics） | Must | Alembic マイグレーション |
| FR-002 | FastAPI バックエンド（CRUD API） | Must | 既存 JSON データの DB 移行含む |
| FR-003 | GET /api/novels — 小説一覧（ジャンルフィルタ、ソート） | Must | |
| FR-004 | GET /api/novels/{slug} — 小説詳細 + 章一覧 | Must | |
| FR-005 | GET /api/novels/{slug}/chapters/{number} — 章本文 + 挿絵 | Must | Markdown 本文返却 |
| FR-006 | POST/DELETE /api/bookmarks — ブックマーク保存・削除 | Must | session_id ベース |
| FR-007 | POST /api/analytics/pageview — PV 記録 | Must | localStorage → DB 移行 |
| FR-008 | GET /api/analytics/dashboard — 分析集計 | Should | 既存フロントエンド分析の DB 化 |
| FR-009 | GET /api/novels/search — 全文検索（タイトル・あらすじ・本文） | Should | pg_trgm |
| FR-010 | POST /api/generate/chapter — 章生成トリガー API | Should | 既存スクリプトの API 化 |
| FR-011 | 連載スケジューラ（cron） | Could | 定期的に新章を自動生成 |
| FR-012 | フロントエンドの API 接続切替 | Must | lib/data.ts → API fetch に変更 |

## 非機能要件

| ID | カテゴリ | 要件 | 基準値 |
|----|----------|------|--------|
| NFR-001 | パフォーマンス | 小説一覧 API レスポンス | < 200ms |
| NFR-002 | パフォーマンス | 章本文 API レスポンス | < 300ms |
| NFR-003 | データ移行 | 既存 3 作品 13 章を DB に移行 | ゼロダウンタイム |
| NFR-004 | 互換性 | 既存フロントエンドの表示が変わらない | 回帰テスト |
| NFR-005 | 可用性 | Docker Compose で完結 | 追加インフラ不要 |

## スコープ

### In（対象範囲）
- FastAPI + PostgreSQL バックエンド構築
- DB スキーマ設計 + Alembic マイグレーション
- JSON → DB データ移行スクリプト
- REST API（小説・章・ブックマーク・分析）
- 全文検索（pg_trgm）
- フロントエンドの API 接続切替
- Docker Compose 更新（postgres, api, migrate サービス追加）

### Out（対象外）
- ユーザー認証（OAuth/JWT）— Phase 3 で検討
- コメント・レーティング — Phase 3
- 管理画面 UI — Phase 3（API のみ先行）
- モバイルアプリ — 対象外
- 決済・サブスクリプション — 対象外

## ステークホルダー

| ロール | 担当 | 責務 |
|--------|------|------|
| プロダクトオーナー | tto | 最終承認 |
| 技術リード | ttoClaw（CEO） | QMOサイクル監督 |
| 開発チーム | QMOフルサイクル | 設計・実装・テスト |

## 用語定義

| 用語 | 定義 |
|------|------|
| 小説（Novel） | 1つの連載作品。メタデータ + 複数の章で構成 |
| 章（Chapter） | 小説の1話分。Markdown 本文 + 挿絵 |
| 挿絵（Illustration） | 章に紐づく画像。ComfyUI で生成 |
| ブックマーク | ユーザーが保存した小説・章の位置 |
| PV | ページビュー。章の閲覧回数 |

## リスク評価

| ID | リスク | 影響度 | 発生確率 | 対策 |
|----|--------|--------|----------|------|
| R-001 | JSON → DB 移行時のデータ不整合 | 高 | 中 | マイグレーションスクリプトのテスト + ロールバック手順 |
| R-002 | フロントエンド切替時の回帰バグ | 中 | 中 | E2E テストで回帰確認 |
| R-003 | PostgreSQL の Docker メモリ消費 | 低 | 低 | 512MB 制限設定 |

## ロールバック方針

- 切り戻し条件: デプロイ後にフロントエンドの表示が壊れた場合
- 切り戻し手順: フロントエンドを JSON 直接読み込みモードに戻す（環境変数切替）
- 影響範囲: API + フロントエンド（DB マイグレーションは追加のみ、破壊的変更なし）

## 受入基準（AC）

| AC-ID | 条件 | 確認方法 |
|-------|------|----------|
| AC-001 | GET /api/novels が 3 作品を返却する | API テスト |
| AC-002 | GET /api/novels/stellar-drift/chapters/1 が章本文を返す | API テスト |
| AC-003 | ブックマークの保存・取得が API 経由で動作する | API テスト |
| AC-004 | PV 記録が DB に永続化される | 結合テスト |
| AC-005 | 全文検索で「魔法」で検索すると魔法学園が見つかる | API テスト |
| AC-006 | 既存フロントエンドの全画面が正常表示される | E2E 回帰テスト |
| AC-007 | Docker Compose up で全サービスが起動する | 手動確認 |
| AC-008 | http://localhost:3600 でアプリにアクセスできる | 手動確認 |
