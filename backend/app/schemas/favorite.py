from pydantic import BaseModel
from datetime import datetime
from app.schemas.article import TagResponse


class FavoriteResponse(BaseModel):
    id: int
    article_id: int
    article_title: str
    article_summary: str | None
    author_name: str
    tags: list[TagResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


class FavoriteStatus(BaseModel):
    favorited: bool
