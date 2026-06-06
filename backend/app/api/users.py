from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import get_settings
from app.models.user import User
from app.schemas.user import UserPublic, UserUpdate
from app.services.user_service import get_user_by_id, update_user, save_avatar

router = APIRouter(prefix="/users", tags=["users"])
settings = get_settings()


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/me", response_model=UserPublic)
async def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        updated = await update_user(db, user, data.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return updated


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    avatar_url = await save_avatar(db, user, content, file.filename or "avatar.png")
    return {"avatar_url": avatar_url}
