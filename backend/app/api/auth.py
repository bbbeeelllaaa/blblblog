from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import (
    UserRegister, UserLogin, TokenResponse, UserDetail,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.services.user_service import (
    register_user, authenticate_user,
    generate_reset_token, reset_password, send_reset_email,
)

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


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    # Always return success to prevent email enumeration
    if user is None:
        return {"message": "If the email exists, a reset link has been sent"}
    token = await generate_reset_token(db, user)
    await db.commit()
    await send_reset_email(user.email, token)
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password_endpoint(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await reset_password(db, data.token, data.password)
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    await db.commit()
    return {"message": "Password has been reset"}
