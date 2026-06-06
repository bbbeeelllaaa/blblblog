from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.article import ArticleSearchResult
from app.services import search_service
from app.services.article_service import get_article_like_count, get_article_comment_count

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=dict)
async def search_articles(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    articles, total = await search_service.hybrid_search(db, q, page, size)
    if not articles and total == 0:
        articles, total = await search_service.fulltext_search(db, q, page, size)

    items = []
    for a in articles:
        items.append({
            "id": a.id,
            "title": a.title,
            "summary": a.summary,
            "author_name": a.author.username if a.author else "Unknown",
            "tags": [{"id": t.id, "name": t.name} for t in (a.tags or [])],
            "created_at": a.created_at,
            "relevance": getattr(a, "_relevance", 0.0),
        })

    return {"items": items, "total": total, "page": page, "size": size}
