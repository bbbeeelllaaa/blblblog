from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.article import Article
from app.models.comment import Comment
from app.models.like import ArticleLike, CommentLike


async def get_all_users(db: AsyncSession, page: int, size: int) -> tuple[list[User], int]:
    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar() or 0
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
    )
    return list(result.scalars().all()), total


async def get_user_stats(db: AsyncSession, user_id: int) -> dict:
    article_count = await db.execute(
        select(func.count(Article.id)).where(Article.author_id == user_id)
    )
    likes_received = await db.execute(
        select(func.count(ArticleLike.id))
        .join(Article, ArticleLike.article_id == Article.id)
        .where(Article.author_id == user_id)
    )
    return {
        "article_count": article_count.scalar() or 0,
        "likes_received": likes_received.scalar() or 0,
    }


async def get_all_articles(db: AsyncSession, page: int, size: int) -> tuple[list[Article], int]:
    total_result = await db.execute(select(func.count(Article.id)))
    total = total_result.scalar() or 0
    result = await db.execute(
        select(Article)
        .options(selectinload(Article.author))
        .order_by(Article.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return list(result.scalars().all()), total


async def get_all_comments(db: AsyncSession, page: int, size: int) -> tuple[list[Comment], int]:
    total_result = await db.execute(select(func.count(Comment.id)))
    total = total_result.scalar() or 0
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.user), selectinload(Comment.article))
        .order_by(Comment.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return list(result.scalars().all()), total


async def delete_comment_admin(db: AsyncSession, comment_id: int) -> bool:
    comment = await db.get(Comment, comment_id)
    if comment is None:
        return False
    await db.delete(comment)
    return True


async def get_dashboard_stats(db: AsyncSession) -> dict:
    users = await db.execute(select(func.count(User.id)))
    articles = await db.execute(select(func.count(Article.id)))
    comments = await db.execute(select(func.count(Comment.id)))
    article_likes = await db.execute(select(func.count(ArticleLike.id)))
    comment_likes = await db.execute(select(func.count(CommentLike.id)))
    return {
        "total_users": users.scalar() or 0,
        "total_articles": articles.scalar() or 0,
        "total_comments": comments.scalar() or 0,
        "total_likes": (article_likes.scalar() or 0) + (comment_likes.scalar() or 0),
    }
