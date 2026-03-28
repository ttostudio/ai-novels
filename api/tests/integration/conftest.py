"""
結合テスト用フィクスチャ: 実 PostgreSQL に接続する
port: 5435 (docker-compose で公開)
DB: novels / novels_password
"""
import os
import sys
import uuid
import datetime
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# api/ ディレクトリを sys.path に追加
_api_dir = os.path.join(os.path.dirname(__file__), "..", "..")
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

TEST_DB_URL = "postgresql://novels:novels_password@localhost:5435/novels"
os.environ["DATABASE_URL"] = TEST_DB_URL

from main import app  # noqa: E402
from database import Base  # noqa: E402
from dependencies import get_db  # noqa: E402
from models.novel import Novel, Chapter, Illustration  # noqa: E402
from models.analytics import Bookmark, PageView  # noqa: E402

engine = create_engine(TEST_DB_URL, pool_pre_ping=True)
TestSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    return engine


@pytest.fixture(scope="function")
def db():
    """関数スコープの DB セッション: テスト後にロールバック"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db):
    """実 DB に接続する TestClient"""
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---- シードデータファクトリ ----

def make_novel(db, slug="test-novel", genre="sf", rating=4.0, status="active"):
    """テスト用 Novel を INSERT して返す"""
    novel = Novel(
        slug=slug,
        title=f"テスト小説 {slug}",
        author="AI",
        genre=genre,
        tags=["テスト"],
        synopsis=f"これは {slug} のあらすじです。テストデータとして使用されます。",
        characters=[],
        cover_image=None,
        rating=rating,
        total_chapters=0,
        latest_chapter=0,
        update_schedule="毎日",
        status=status,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
    )
    db.add(novel)
    db.flush()
    return novel


def make_chapter(db, novel_slug, number=1, title=None, content=None):
    """テスト用 Chapter を INSERT して返す"""
    ch = Chapter(
        novel_slug=novel_slug,
        number=number,
        title=title or f"第{number}話",
        content=content or f"これは第{number}話の本文です。" * 20,
        published_at=datetime.datetime.utcnow(),
        created_at=datetime.datetime.utcnow(),
    )
    db.add(ch)
    db.flush()
    return ch


def make_bookmark(db, session_id, novel_slug, chapter_number=1):
    """テスト用 Bookmark を INSERT して返す"""
    bm = Bookmark(
        session_id=session_id,
        novel_slug=novel_slug,
        chapter_number=chapter_number,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(bm)
    db.flush()
    return bm


def make_pageview(db, novel_slug, chapter_number=None, session_id=None):
    """テスト用 PageView を INSERT して返す"""
    pv = PageView(
        novel_slug=novel_slug,
        chapter_number=chapter_number,
        session_id=session_id or str(uuid.uuid4()),
        viewed_at=datetime.datetime.utcnow(),
    )
    db.add(pv)
    db.flush()
    return pv
