from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.comment import Comment
from app.models.like import CommentLike


async def create_comment(
    db: AsyncSession, user_id: int, article_id: int, content: str, parent_id: int | None = None
) -> Comment:
    comment = Comment(
        user_id=user_id,
        article_id=article_id,
        content=content,
        parent_id=parent_id,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment, ["user"])
    return comment


async def get_article_comments(
    db: AsyncSession, article_id: int, page: int = 1, size: int = 20
) -> tuple[list[Comment], int]:
    count_result = await db.execute(
        select(func.count(Comment.id)).where(
            Comment.article_id == article_id,
            Comment.parent_id.is_(None),
            Comment.is_deleted == False,
        )
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Comment)
        .where(
            Comment.article_id == article_id,
            Comment.parent_id.is_(None),
            Comment.is_deleted == False,
        )
        .options(
            selectinload(Comment.user),
            selectinload(Comment.replies).selectinload(Comment.user),
        )
        .order_by(Comment.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    comments = result.scalars().unique().all()
    return list(comments), total


async def get_comment_by_id(db: AsyncSession, comment_id: int) -> Comment | None:
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id).options(selectinload(Comment.user))
    )
    return result.scalar_one_or_none()


async def get_comment_like_count(db: AsyncSession, comment_id: int) -> int:
    result = await db.execute(
        select(func.count(CommentLike.id)).where(CommentLike.comment_id == comment_id)
    )
    return result.scalar() or 0


async def check_comment_liked(db: AsyncSession, comment_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(CommentLike).where(
            CommentLike.comment_id == comment_id,
            CommentLike.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None
