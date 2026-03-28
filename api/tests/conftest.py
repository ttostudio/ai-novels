"""
共有フィクスチャ: DATABASE_URL を設定してから app をインポートする
"""
import os
import sys

# テスト用ダミー DATABASE_URL（ユニットテストでは実際には接続しない）
os.environ.setdefault("DATABASE_URL", "postgresql://novels:novels_password@localhost:5434/novels")

# api/ ディレクトリを sys.path に追加
_api_dir = os.path.join(os.path.dirname(__file__), "..", )
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)
