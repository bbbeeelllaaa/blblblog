from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.comment import Comment
from app.models.like import CommentLike


async def create_comment(
    db: AsyncSession, user_id: int, article_id: int, content: str, parent_id: int | None = None,
    image_url: str | None = None,
) -> Comment:
    comment = Comment(
        user_id=user_id,
        article_id=article_id,
        content=content,
        parent_id=parent_id,
        image_url=image_url,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment, ["user"])
    return comment


async def get_article_comments(
    db: AsyncSession, article_id: int, page: int = 1, size: int = 20, sort: str = "newest"
) -> tuple[list[Comment], int]:
    count_result = await db.execute(
        select(func.count(Comment.id)).where(
            Comment.article_id == article_id,
            Comment.parent_id.is_(None),
            Comment.is_deleted == False,
        )
    )
    total = count_result.scalar() or 0

    query = (
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
    )

    if sort == "most_liked":
        like_count_subq = (
            select(CommentLike.comment_id, func.count(CommentLike.id).label("cnt"))
            .group_by(CommentLike.comment_id)
            .subquery()
        )
        query = query.outerjoin(like_count_subq, Comment.id == like_count_subq.c.comment_id)
        query = query.order_by(desc(func.coalesce(like_count_subq.c.cnt, 0)), desc(Comment.created_at))
    else:
        query = query.order_by(desc(Comment.created_at))

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
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


async def batch_get_comment_like_data(
    db: AsyncSession, comment_ids: list[int], user_id: int | None
) -> tuple[dict[int, int], set[int]]:
    """Return (comment_id -> like_count, set of comment_ids liked by user)."""
    if not comment_ids:
        return {}, set()

    count_result = await db.execute(
        select(CommentLike.comment_id, func.count(CommentLike.id))
        .where(CommentLike.comment_id.in_(comment_ids))
        .group_by(CommentLike.comment_id)
    )
    like_counts = dict(count_result.all()) if count_result else {}

    liked_set = set()
    if user_id:
        liked_result = await db.execute(
            select(CommentLike.comment_id).where(
                CommentLike.comment_id.in_(comment_ids),
                CommentLike.user_id == user_id,
            )
        )
        liked_set = set(liked_result.scalars().all())

    return like_counts, liked_set
