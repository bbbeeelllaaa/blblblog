from pydantic import BaseModel, Field
from datetime import datetime


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TagResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ArticleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    summary: str | None = None
    tags: list[str] = []
    is_published: bool = True


class ArticleUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    content: str | None = None
    summary: str | None = None
    tags: list[str] | None = None
    is_published: bool | None = None


class ArticleListResponse(BaseModel):
    id: int
    title: str
    summary: str | None
    author_id: int
    author_name: str
    author_avatar: str | None
    tags: list[TagResponse]
    view_count: int
    like_count: int = 0
    comment_count: int = 0
    is_published: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ArticleDetailResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: str | None
    author_id: int
    author_name: str
    author_avatar: str | None
    tags: list[TagResponse]
    view_count: int
    like_count: int = 0
    comment_count: int = 0
    is_favorited: bool = False
    is_liked: bool = False
    is_published: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ArticleSearchResult(BaseModel):
    id: int
    title: str
    summary: str | None
    author_name: str
    tags: list[TagResponse]
    created_at: datetime
    relevance: float = 0.0

    model_config = {"from_attributes": True}
