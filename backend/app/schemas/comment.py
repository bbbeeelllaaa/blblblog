from pydantic import BaseModel, Field
from datetime import datetime


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    parent_id: int | None = None
    image_url: str | None = None


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    username: str
    user_avatar: str | None
    article_id: int
    parent_id: int | None
    image_url: str | None = None
    like_count: int = 0
    is_liked: bool = False
    replies: list["CommentResponse"] = []
    created_at: datetime

    model_config = {"from_attributes": True}


CommentResponse.model_rebuild()
