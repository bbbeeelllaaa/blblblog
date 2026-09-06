"""move all existing articles to 'life' category

Revision ID: 010
Revises: 009
Create Date: 2026-09-07
"""
from typing import Sequence, Union
from alembic import op


revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 把所有现有文章统一归到"生活琐事"（life）板块
    op.execute("UPDATE articles SET category = 'life'")


def downgrade() -> None:
    # 数据迁移无法反向，保持空操作
    pass
