from fastapi import APIRouter, Depends, Query
from app.services.online_service import record_page_view, get_online_count, get_article_stats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.post("/view/{article_id}")
async def record_view(article_id: int, user_id: str = Query(default="anonymous")):
    """Record a page view for an article."""
    return await record_page_view(article_id, user_id)


@router.get("/online")
async def online_users():
    """Get current online user count."""
    count = await get_online_count()
    return {"online_users": count}


@router.get("/article/{article_id}")
async def article_stats(article_id: int):
    """Get article PV/UV stats."""
    return await get_article_stats(article_id)
