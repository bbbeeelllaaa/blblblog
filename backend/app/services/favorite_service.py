from sqlalchemy import select, func, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.favorite import Favorite
from app.models.article import Article


async def toggle_favorite(db: AsyncSession, user_id: int, article_id: int) -> bool:
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user_id,
            Favorite.article_id == article_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.execute(
            delete(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.article_id == article_id,
            )
        )
        return False
    else:
        db.add(Favorite(user_id=user_id, article_id=article_id))
        return True


async def get_user_favorites(
    db: AsyncSession, user_id: int, page: int = 1, size: int = 20
) -> tuple[list[Favorite], int]:
    count_result = await db.execute(
        select(func.count(Favorite.id)).where(Favorite.user_id == user_id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == user_id)
        .options(
            selectinload(Favorite.article).selectinload(Article.tags),
            selectinload(Favorite.article).selectinload(Article.author),
        )
        .order_by(desc(Favorite.created_at))
        .offset((page - 1) * size)
        .limit(size)
    )
    favorites = result.scalars().unique().all()
    return list(favorites), total
