from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserDetail
from app.services.user_service import register_user, authenticate_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where((User.email == data.email) | (User.username == data.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user = await register_user(db, data.username, data.email, data.password)
    token = await authenticate_user(db, data.email, data.password)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    token = await authenticate_user(db, data.email, data.password)
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserDetail)
async def get_me(user: User = Depends(get_current_user)):
    return user
