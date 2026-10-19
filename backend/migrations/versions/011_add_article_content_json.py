"""add nullable rich article documents without rewriting legacy Markdown

Revision ID: 011
Revises: 010
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("articles", sa.Column("content_json", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("articles", "content_json")
