from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user
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
        db, user.id, article_id, data.content, data.parent_id, data.image_url
    )
    return _build_comment_dict(comment, like_count=0, is_liked=False, user_id=user.id)


@router.get("", response_model=dict)
async def list_comments(
    article_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort: str = Query("newest", pattern="^(newest|most_liked)$"),
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    comments, total = await comment_service.get_article_comments(db, article_id, page, size, sort)
    all_ids = _collect_comment_ids(comments)
    like_counts, liked_set = await comment_service.batch_get_comment_like_data(
        db, all_ids, user.id if user else None
    )
    items = [_build_comment_tree(c, like_counts, liked_set, user.id if user else None) for c in comments]
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


def _collect_comment_ids(comments: list[Comment]) -> list[int]:
    ids = []
    for c in comments:
        ids.append(c.id)
        for r in (c.replies or []):
            ids.append(r.id)
    return ids


def _build_comment_tree(comment: Comment, like_counts: dict[int, int], liked_set: set[int], user_id: int | None) -> dict:
    result = _build_comment_dict(
        comment,
        like_count=like_counts.get(comment.id, 0),
        is_liked=comment.id in liked_set,
        user_id=user_id,
    )
    result["replies"] = [
        _build_comment_dict(
            reply,
            like_count=like_counts.get(reply.id, 0),
            is_liked=reply.id in liked_set,
            user_id=user_id,
        )
        for reply in (comment.replies or [])
    ]
    return result


def _build_comment_dict(comment: Comment, like_count: int, is_liked: bool, user_id: int | None) -> dict:
    return {
        "id": comment.id,
        "content": comment.content if not comment.is_deleted else "[deleted]",
        "user_id": comment.user_id,
        "username": comment.user.username if comment.user else "Unknown",
        "user_avatar": comment.user.avatar if comment.user else None,
        "article_id": comment.article_id,
        "parent_id": comment.parent_id,
        "image_url": comment.image_url,
        "like_count": like_count,
        "is_liked": is_liked,
        "replies": [],
        "created_at": comment.created_at,
    }
