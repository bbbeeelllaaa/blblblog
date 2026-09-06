"""add articles.category

Revision ID: 009
Revises: 008
Create Date: 2026-09-06
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("articles", sa.Column("category", sa.String(20), nullable=True))
    op.create_index("ix_articles_category", "articles", ["category"])


def downgrade() -> None:
    op.drop_index("ix_articles_category", table_name="articles")
    op.drop_column("articles", "category")
