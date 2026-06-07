"""add intro, links to users; add category to article_tags

Revision ID: 005
Revises: 004
Create Date: 2026-06-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("intro", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("links", sa.Text(), nullable=True))
    op.add_column("article_tags", sa.Column("category", sa.String(50), nullable=True, index=True))


def downgrade() -> None:
    op.drop_column("users", "intro")
    op.drop_column("users", "links")
    op.drop_column("article_tags", "category")
