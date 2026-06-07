import os
import uuid
import aiofiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import get_settings

settings = get_settings()


async def register_user(db: AsyncSession, username: str, email: str, password: str) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> str | None:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        return None
    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    user.login_count = (user.login_count or 0) + 1
    await db.flush()
    return create_access_token({"sub": str(user.id)})


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def update_user(db: AsyncSession, user: User, data: dict) -> User:
    for key, value in data.items():
        if value is not None:
            if key == "username" and value != user.username:
                existing = await db.execute(select(User).where(User.username == value))
                if existing.scalar_one_or_none():
                    raise ValueError("Username already taken")
            setattr(user, key, value)
    await db.flush()
    await db.refresh(user)
    return user


async def save_avatar(db: AsyncSession, user: User, file_data: bytes, filename: str) -> str:
    ext = os.path.splitext(filename)[1] or ".png"
    new_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, new_name)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(file_data)
    avatar_url = f"/uploads/{new_name}"
    user.avatar = avatar_url
    await db.flush()
    return avatar_url
