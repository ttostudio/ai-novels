"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "novels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("author", sa.String(200), nullable=False, server_default="AI"),
        sa.Column("genre", sa.String(50), nullable=False),
        sa.Column("tags", ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("synopsis", sa.Text(), nullable=False),
        sa.Column("characters", JSONB(), nullable=False, server_default="[]"),
        sa.Column("cover_image", sa.String(500)),
        sa.Column("rating", sa.Numeric(3, 1), nullable=False, server_default="0.0"),
        sa.Column("total_chapters", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("latest_chapter", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("update_schedule", sa.String(100)),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('active', 'paused', 'completed')",
                           name="ck_novels_status"),
        sa.CheckConstraint("rating >= 0.0 AND rating <= 5.0", name="ck_novels_rating"),
    )
    op.create_index("idx_novels_genre",  "novels", ["genre"])
    op.create_index("idx_novels_status", "novels", ["status"])
    op.create_index("idx_novels_slug",   "novels", ["slug"])
    op.create_index(
        "idx_novels_title_trgm", "novels", ["title"],
        postgresql_using="gin",
        postgresql_ops={"title": "gin_trgm_ops"},
    )
    op.create_index(
        "idx_novels_synopsis_trgm", "novels", ["synopsis"],
        postgresql_using="gin",
        postgresql_ops={"synopsis": "gin_trgm_ops"},
    )

    op.create_table(
        "chapters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("novel_slug", sa.String(100),
                  sa.ForeignKey("novels.slug", ondelete="CASCADE"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("published_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.UniqueConstraint("novel_slug", "number", name="uq_chapters_novel_number"),
    )
    op.create_index("idx_chapters_novel_slug", "chapters", ["novel_slug"])
    op.create_index("idx_chapters_number",     "chapters", ["novel_slug", "number"])
    op.create_index(
        "idx_chapters_content_trgm", "chapters", ["content"],
        postgresql_using="gin",
        postgresql_ops={"content": "gin_trgm_ops"},
    )

    op.create_table(
        "illustrations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("chapter_id", sa.Integer(),
                  sa.ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_path", sa.String(500), nullable=False),
        sa.Column("alt_text", sa.String(500)),
        sa.Column("position", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
    )
    op.create_index("idx_illustrations_chapter_id", "illustrations", ["chapter_id"])

    op.create_table(
        "bookmarks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.String(100), nullable=False),
        sa.Column("novel_slug", sa.String(100),
                  sa.ForeignKey("novels.slug", ondelete="CASCADE"), nullable=False),
        sa.Column("chapter_number", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.UniqueConstraint("session_id", "novel_slug", name="uq_bookmarks_session_novel"),
    )
    op.create_index("idx_bookmarks_session_id", "bookmarks", ["session_id"])
    op.create_index("idx_bookmarks_novel_slug", "bookmarks", ["novel_slug"])

    op.create_table(
        "pageviews",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("novel_slug", sa.String(100), nullable=False),
        sa.Column("chapter_number", sa.Integer()),
        sa.Column("session_id", sa.String(100)),
        sa.Column("viewed_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
    )
    op.create_index("idx_pageviews_novel_slug", "pageviews", ["novel_slug"])
    op.create_index("idx_pageviews_viewed_at",  "pageviews", ["viewed_at"])

    op.create_table(
        "reading_progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.String(100), nullable=False),
        sa.Column("novel_slug", sa.String(100),
                  sa.ForeignKey("novels.slug", ondelete="CASCADE"), nullable=False),
        sa.Column("chapter_number", sa.Integer(), nullable=False),
        sa.Column("progress_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.UniqueConstraint("session_id", "novel_slug",
                            name="uq_reading_progress_session_novel"),
        sa.CheckConstraint("progress_percent >= 0 AND progress_percent <= 100",
                           name="ck_reading_progress_percent"),
    )
    op.create_index("idx_reading_progress_session", "reading_progress", ["session_id"])


def downgrade() -> None:
    op.drop_table("reading_progress")
    op.drop_table("pageviews")
    op.drop_table("bookmarks")
    op.drop_table("illustrations")
    op.drop_table("chapters")
    op.drop_table("novels")
