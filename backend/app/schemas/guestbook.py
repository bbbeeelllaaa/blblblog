from pydantic import BaseModel, Field
from datetime import datetime


class GuestbookMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    image_url: str | None = None


class GuestbookMessageResponse(BaseModel):
    id: int
    content: str
    user_id: int
    username: str
    user_avatar: str | None
    image_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
