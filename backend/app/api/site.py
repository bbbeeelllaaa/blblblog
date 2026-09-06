from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from sqlalchemy import select

router = APIRouter(prefix="/site", tags=["site"])


@router.get("/sidebar")
async def get_sidebar_data(db: AsyncSession = Depends(get_db)):
    # Owner = first admin user (lowest id with is_admin=True)
    owner_result = await db.execute(
        select(User).where(User.is_admin == True).order_by(User.id).limit(1)
    )
    owner = owner_result.scalar_one_or_none()

    owner_data = None
    if owner:
        owner_data = {
            "id": owner.id,
            "username": owner.username,
            "avatar": owner.avatar,
            "bio": owner.bio,
            "interests": owner.interests,
            "experience": owner.experience,
            "intro": owner.intro,
            "links": owner.links,
            "featured_cards": owner.featured_cards,
        }

    return {"owner": owner_data}


@router.put("/owner")
async def update_owner(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admin can update owner info")

    allowed = {"intro", "links", "bio", "interests", "experience", "featured_cards"}
    update_data = {k: v for k, v in data.items() if k in allowed and v is not None}
    if not update_data:
        return {"ok": False}

    for key, value in update_data.items():
        setattr(current_user, key, value)
    await db.flush()
    return {"ok": True}
