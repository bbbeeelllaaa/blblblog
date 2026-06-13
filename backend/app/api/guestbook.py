from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.models.user import User
from app.schemas.guestbook import GuestbookMessageCreate, GuestbookMessageResponse
from app.services import guestbook_service

router = APIRouter(prefix="/guestbook", tags=["guestbook"])


@router.post("", response_model=GuestbookMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    data: GuestbookMessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msg = await guestbook_service.create_message(
        db, user.id, data.content, data.image_url
    )
    return _build_message_dict(msg)


@router.get("", response_model=dict)
async def list_messages(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    messages, total = await guestbook_service.get_messages(db, page, size)
    items = [_build_message_dict(m) for m in messages]
    return {"items": items, "total": total, "page": page, "size": size}


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msg = await guestbook_service.get_message_by_id(db, message_id)
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.user_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    msg.is_deleted = True


def _build_message_dict(msg) -> dict:
    return {
        "id": msg.id,
        "content": msg.content,
        "user_id": msg.user_id,
        "username": msg.user.username if msg.user else "Unknown",
        "user_avatar": msg.user.avatar if msg.user else None,
        "image_url": msg.image_url,
        "created_at": msg.created_at,
    }
