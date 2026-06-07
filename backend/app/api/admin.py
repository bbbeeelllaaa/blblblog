from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.schemas.user import UserAdminToggle, DashboardStats
from app.services import admin_service, article_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=dict)
async def admin_list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    users, total = await admin_service.get_all_users(db, page, size)
    items = []
    for u in users:
        stats = await admin_service.get_user_stats(db, u.id)
        items.append({
            "id": u.id, "username": u.username, "email": u.email,
            "avatar": u.avatar, "is_admin": u.is_admin,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "login_count": u.login_count or 0,
            "article_count": stats["article_count"],
            "likes_received": stats["likes_received"],
            "created_at": u.created_at.isoformat(),
        })
    return {"items": items, "total": total, "page": page, "size": size}


@router.put("/users/{user_id}/admin")
async def admin_toggle_user_admin(
    user_id: int,
    data: UserAdminToggle,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    user.is_admin = data.is_admin
    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await db.delete(user)


@router.get("/articles", response_model=dict)
async def admin_list_articles(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    articles, total = await admin_service.get_all_articles(db, page, size)
    items = [{
        "id": a.id,
        "title": a.title,
        "author_id": a.author_id,
        "author_name": a.author.username if a.author else "Unknown",
        "is_published": a.is_published,
        "view_count": a.view_count,
        "created_at": a.created_at.isoformat(),
    } for a in articles]
    return {"items": items, "total": total, "page": page, "size": size}


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_article(
    article_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    article = await article_service.get_article_by_id(db, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.delete(article)


@router.get("/comments", response_model=dict)
async def admin_list_comments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    comments, total = await admin_service.get_all_comments(db, page, size)
    items = [{
        "id": c.id,
        "content": c.content[:200],
        "user_id": c.user_id,
        "username": c.user.username if c.user else "Unknown",
        "article_id": c.article_id,
        "article_title": c.article.title if c.article else "Unknown",
        "is_deleted": c.is_deleted,
        "created_at": c.created_at.isoformat(),
    } for c in comments]
    return {"items": items, "total": total, "page": page, "size": size}


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_comment(
    comment_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    deleted = await admin_service.delete_comment_admin(db, comment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found")


@router.get("/stats", response_model=DashboardStats)
async def admin_dashboard_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_dashboard_stats(db)
