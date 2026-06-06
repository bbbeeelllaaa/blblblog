from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.article import Article, ArticleTag, article_tag_association
from app.models.comment import Comment
from app.models.like import ArticleLike
from app.models.favorite import Favorite
from app.models.user import User


async def create_article(db: AsyncSession, author_id: int, data: dict) -> Article:
    tags = data.pop("tags", [])
    article = Article(author_id=author_id, **data)
    if tags:
        tag_objs = await _get_or_create_tags(db, tags)
        article.tags = tag_objs
    db.add(article)
    await db.flush()
    await db.refresh(article)
    return article


async def update_article(db: AsyncSession, article: Article, data: dict) -> Article:
    tags = data.pop("tags", None)
    for key, value in data.items():
        if value is not None:
            setattr(article, key, value)
    if tags is not None:
        tag_objs = await _get_or_create_tags(db, tags)
        article.tags = tag_objs
    await db.flush()
    await db.refresh(article)
    return article


async def get_articles(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    tag: str | None = None,
    author_id: int | None = None,
) -> tuple[list[Article], int]:
    query = select(Article).where(Article.is_published == True)
    count_query = select(func.count(Article.id)).where(Article.is_published == True)

    if tag:
        query = query.join(article_tag_association).join(ArticleTag).where(ArticleTag.name == tag)
        count_query = count_query.join(article_tag_association).join(ArticleTag).where(ArticleTag.name == tag)

    if author_id:
        query = query.where(Article.author_id == author_id)
        count_query = count_query.where(Article.author_id == author_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(Article.created_at)).offset((page - 1) * size).limit(size)
    query = query.options(selectinload(Article.tags), selectinload(Article.author))
    result = await db.execute(query)
    articles = result.scalars().unique().all()

    return list(articles), total


async def get_article_by_id(db: AsyncSession, article_id: int) -> Article | None:
    result = await db.execute(
        select(Article)
        .where(Article.id == article_id)
        .options(
            selectinload(Article.tags),
            selectinload(Article.author),
        )
    )
    return result.scalar_one_or_none()


async def get_article_like_count(db: AsyncSession, article_id: int) -> int:
    result = await db.execute(
        select(func.count(ArticleLike.id)).where(ArticleLike.article_id == article_id)
    )
    return result.scalar() or 0


async def get_article_comment_count(db: AsyncSession, article_id: int) -> int:
    result = await db.execute(
        select(func.count(Comment.id)).where(
            Comment.article_id == article_id,
            Comment.is_deleted == False,
        )
    )
    return result.scalar() or 0


async def check_article_liked(db: AsyncSession, article_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(ArticleLike).where(
            ArticleLike.article_id == article_id,
            ArticleLike.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def check_article_favorited(db: AsyncSession, article_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(Favorite).where(
            Favorite.article_id == article_id,
            Favorite.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def _get_or_create_tags(db: AsyncSession, tag_names: list[str]) -> list[ArticleTag]:
    tags = []
    for name in tag_names:
        name = name.strip().lower()
        if not name:
            continue
        result = await db.execute(select(ArticleTag).where(ArticleTag.name == name))
        tag = result.scalar_one_or_none()
        if tag is None:
            tag = ArticleTag(name=name)
            db.add(tag)
            await db.flush()
        tags.append(tag)
    return tags


async def increment_view_count(db: AsyncSession, article: Article) -> None:
    article.view_count += 1
    await db.flush()
