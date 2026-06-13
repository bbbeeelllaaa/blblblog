from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.guestbook import GuestbookMessage


async def create_message(
    db: AsyncSession, user_id: int, content: str, image_url: str | None = None,
) -> GuestbookMessage:
    msg = GuestbookMessage(
        user_id=user_id,
        content=content,
        image_url=image_url,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg, ["user"])
    return msg


async def get_messages(
    db: AsyncSession, page: int = 1, size: int = 20,
) -> tuple[list[GuestbookMessage], int]:
    base_where = GuestbookMessage.is_deleted == False

    count_result = await db.execute(
        select(func.count(GuestbookMessage.id)).where(base_where)
    )
    total = count_result.scalar() or 0

    query = (
        select(GuestbookMessage)
        .where(base_where)
        .options(selectinload(GuestbookMessage.user))
        .order_by(desc(GuestbookMessage.created_at))
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(query)
    messages = result.scalars().unique().all()
    return list(messages), total


async def get_message_by_id(db: AsyncSession, message_id: int) -> GuestbookMessage | None:
    result = await db.execute(
        select(GuestbookMessage)
        .where(GuestbookMessage.id == message_id)
        .options(selectinload(GuestbookMessage.user))
    )
    return result.scalar_one_or_none()
