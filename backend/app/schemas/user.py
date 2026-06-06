from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: int
    username: str
    avatar: str | None = None
    bio: str | None = None
    interests: str | None = None
    experience: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserDetail(UserPublic):
    email: str

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    bio: str | None = None
    interests: str | None = None
    experience: str | None = None
