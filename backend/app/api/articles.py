from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_optional_user, require_admin
from app.models.user import User
from app.models.article import Article
from app.schemas.article import (
    ArticleCreate, ArticleUpdate, ArticleListResponse, ArticleDetailResponse,
)
from app.services import article_service, search_service

router = APIRouter(prefix="/articles", tags=["articles"])


@router.post("", response_model=ArticleDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_article(
    data: ArticleCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    article = await article_service.create_article(db, user.id, data.model_dump())
    await search_service.update_search_vector(db, article)
    await search_service.update_embedding(db, article)
    await db.commit()
    return await _build_detail(db, article, user.id)


@router.put("/{article_id}", response_model=ArticleDetailResponse)
async def update_article(
    article_id: int,
    data: ArticleUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    article = await article_service.get_article_by_id(db, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    article = await article_service.update_article(db, article, data.model_dump(exclude_unset=True))
    await search_service.update_search_vector(db, article)
    if data.title or data.content:
        await search_service.update_embedding(db, article)
    await db.commit()
    return await _build_detail(db, article, user.id)


@router.get("", response_model=dict)
async def list_articles(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    tag: str | None = None,
    category: str | None = None,
    author_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    # Only author can view their own drafts
    if status == "draft":
        if user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        if author_id is None or user.id != author_id:
            author_id = user.id
    published_only = status != "draft"
    articles, total = await article_service.get_articles(db, page, size, tag, author_id, published_only, category)
    items = []
    for a in articles:
        items.append(await _build_list_item(db, a))
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/{article_id}", response_model=ArticleDetailResponse)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    article = await article_service.get_article_by_id(db, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    if not article.is_published and (user is None or user.id != article.author_id):
        raise HTTPException(status_code=404, detail="Article not found")
    result = await _build_detail(db, article, user.id if user else None)
    if article.is_published:
        await article_service.increment_view_count(db, article)
    await db.commit()
    result["view_count"] = article.view_count
    return result


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: int,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    article = await article_service.get_article_by_id(db, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.delete(article)
    await db.commit()


async def _build_list_item(db: AsyncSession, article: Article) -> dict:
    like_count = await article_service.get_article_like_count(db, article.id)
    comment_count = await article_service.get_article_comment_count(db, article.id)
    return {
        "id": article.id,
        "title": article.title,
        "summary": article.summary or (article.content[:200] + "..." if article.content else None),
        "author_id": article.author_id,
        "author_name": article.author.username,
        "author_avatar": article.author.avatar,
        "category": article.category,
        "tags": [{"id": t.id, "name": t.name} for t in article.tags],
        "view_count": article.view_count,
        "like_count": like_count,
        "comment_count": comment_count,
        "is_published": article.is_published,
        "created_at": article.created_at.isoformat(),
        "updated_at": article.updated_at.isoformat(),
    }


async def _build_detail(db: AsyncSession, article: Article, user_id: int | None = None) -> dict:
    like_count = await article_service.get_article_like_count(db, article.id)
    comment_count = await article_service.get_article_comment_count(db, article.id)
    is_liked = False
    is_favorited = False
    if user_id:
        is_liked = await article_service.check_article_liked(db, article.id, user_id)
        is_favorited = await article_service.check_article_favorited(db, article.id, user_id)
    return {
        "id": article.id,
        "title": article.title,
        "content": article.content,
        "summary": article.summary,
        "author_id": article.author_id,
        "author_name": article.author.username if article.author else "Unknown",
        "author_avatar": article.author.avatar if article.author else None,
        "category": article.category,
        "tags": [{"id": t.id, "name": t.name} for t in (article.tags or [])],
        "view_count": article.view_count,
        "like_count": like_count,
        "comment_count": comment_count,
        "is_favorited": is_favorited,
        "is_liked": is_liked,
        "is_published": article.is_published,
        "created_at": article.created_at.isoformat(),
        "updated_at": article.updated_at.isoformat(),
    }


