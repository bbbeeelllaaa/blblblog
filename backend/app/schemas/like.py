from pydantic import BaseModel


class LikeResponse(BaseModel):
    liked: bool
    like_count: int
