from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.like import LikeResponse
from app.services.like_service import toggle_article_like, toggle_comment_like

router = APIRouter(prefix="/likes", tags=["likes"])


@router.post("/articles/{article_id}", response_model=LikeResponse)
async def like_article(
    article_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await toggle_article_like(db, user.id, article_id)


@router.post("/comments/{comment_id}", response_model=LikeResponse)
async def like_comment(
    comment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await toggle_comment_like(db, user.id, comment_id)
