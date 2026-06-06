from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentResponse
from app.services import comment_service

router = APIRouter(prefix="/articles/{article_id}/comments", tags=["comments"])


@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    article_id: int,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.parent_id:
        parent = await comment_service.get_comment_by_id(db, data.parent_id)
        if parent is None or parent.article_id != article_id:
            raise HTTPException(status_code=400, detail="Invalid parent comment")

    comment = await comment_service.create_comment(
        db, user.id, article_id, data.content, data.parent_id
    )
    return _to_comment_response(comment, user.id)


@router.get("", response_model=dict)
async def list_comments(
    article_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: User | None = Depends(_get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    comments, total = await comment_service.get_article_comments(db, article_id, page, size)
    user_id = user.id if user else None
    items = []
    for c in comments:
        items.append(await _to_comment_response(c, user_id))
    return {"items": items, "total": total, "page": page, "size": size}


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    article_id: int,
    comment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await comment_service.get_comment_by_id(db, comment_id)
    if comment is None or comment.article_id != article_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    comment.is_deleted = True


async def _get_optional_user(db: AsyncSession = Depends(get_db)) -> User | None:
    return None


def _to_comment_response(comment: Comment, user_id: int | None = None) -> dict:
    return {
        "id": comment.id,
        "content": comment.content if not comment.is_deleted else "[deleted]",
        "user_id": comment.user_id,
        "username": comment.user.username if comment.user else "Unknown",
        "user_avatar": comment.user.avatar if comment.user else None,
        "article_id": comment.article_id,
        "parent_id": comment.parent_id,
        "like_count": 0,
        "is_liked": False,
        "replies": [],
        "created_at": comment.created_at,
    }
