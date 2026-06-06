from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.favorite import FavoriteResponse, FavoriteStatus
from app.services.favorite_service import toggle_favorite, get_user_favorites
from app.services.article_service import get_article_like_count, get_article_comment_count

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.post("/articles/{article_id}", response_model=FavoriteStatus)
async def favorite_article(
    article_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    favorited = await toggle_favorite(db, user.id, article_id)
    return {"favorited": favorited}


@router.get("", response_model=dict)
async def list_favorites(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    favorites, total = await get_user_favorites(db, user.id, page, size)
    items = []
    for fav in favorites:
        article = fav.article
        items.append({
            "id": fav.id,
            "article_id": article.id,
            "article_title": article.title,
            "article_summary": article.summary,
            "author_id": article.author_id,
            "author_name": article.author.username if article.author else "Unknown",
            "author_avatar": article.author.avatar if article.author else None,
            "tags": [{"id": t.id, "name": t.name} for t in (article.tags or [])],
            "view_count": article.view_count,
            "like_count": await get_article_like_count(db, article.id),
            "comment_count": await get_article_comment_count(db, article.id),
            "created_at": fav.created_at,
        })
    return {"items": items, "total": total, "page": page, "size": size}
