from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.like import ArticleLike, CommentLike
from app.services.article_service import get_article_like_count
from app.services.comment_service import get_comment_like_count


async def toggle_article_like(db: AsyncSession, user_id: int, article_id: int) -> dict:
    result = await db.execute(
        select(ArticleLike).where(
            ArticleLike.user_id == user_id,
            ArticleLike.article_id == article_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.execute(
            delete(ArticleLike).where(
                ArticleLike.user_id == user_id,
                ArticleLike.article_id == article_id,
            )
        )
        liked = False
    else:
        db.add(ArticleLike(user_id=user_id, article_id=article_id))
        liked = True
    await db.flush()
    count = await get_article_like_count(db, article_id)
    return {"liked": liked, "like_count": count}


async def toggle_comment_like(db: AsyncSession, user_id: int, comment_id: int) -> dict:
    result = await db.execute(
        select(CommentLike).where(
            CommentLike.user_id == user_id,
            CommentLike.comment_id == comment_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.execute(
            delete(CommentLike).where(
                CommentLike.user_id == user_id,
                CommentLike.comment_id == comment_id,
            )
        )
        liked = False
    else:
        db.add(CommentLike(user_id=user_id, comment_id=comment_id))
        liked = True
    await db.flush()
    count = await get_comment_like_count(db, comment_id)
    return {"liked": liked, "like_count": count}
