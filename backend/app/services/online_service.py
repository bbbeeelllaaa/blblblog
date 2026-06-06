import time
from redis.asyncio import Redis
from app.core.config import get_settings

settings = get_settings()

PV_KEY = "blog:pv:{}"
UV_KEY = "blog:uv:{}"
ONLINE_KEY = "blog:online:{}"
ACTIVE_USERS_KEY = "blog:active_users"


async def get_redis() -> Redis:
    return Redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)


async def record_page_view(article_id: int, user_identifier: str) -> dict:
    """Record PV and UV for an article using Redis."""
    redis = await get_redis()
    try:
        minute = int(time.time() // 60)
        pv_key = PV_KEY.format(minute)
        uv_key = UV_KEY.format(article_id)
        online_key = ONLINE_KEY.format(user_identifier)
        article_uv_key = f"blog:article_uv:{article_id}"

        await redis.incr(pv_key)
        await redis.expire(pv_key, 3600)

        await redis.pfadd(uv_key, user_identifier)
        await redis.pfadd(article_uv_key, user_identifier)

        await redis.setex(online_key, 300, "1")

        online_count = await _count_online(redis)
        uv_count = await redis.pfcount(article_uv_key)

        return {
            "online_users": online_count,
            "article_uv": uv_count,
        }
    finally:
        await redis.aclose()


async def get_online_count() -> int:
    redis = await get_redis()
    try:
        return await _count_online(redis)
    finally:
        await redis.aclose()


async def get_article_stats(article_id: int) -> dict:
    redis = await get_redis()
    try:
        article_uv_key = f"blog:article_uv:{article_id}"
        uv = await redis.pfcount(article_uv_key)

        minute = int(time.time() // 60)
        pv = 0
        for i in range(60):
            key = PV_KEY.format(minute - i)
            v = await redis.get(key)
            if v:
                pv += int(v)

        return {"pv": pv, "uv": uv}
    finally:
        await redis.aclose()


async def _count_online(redis: Redis) -> int:
    """Count online users who were active in the last 5 minutes."""
    now = time.time()
    # Scan for online keys set in last 5 minutes
    count = 0
    cursor = 0
    while True:
        cursor, keys = await redis.scan(cursor, match="blog:online:*", count=100)
        for key in keys:
            val = await redis.get(key)
            if val:
                count += 1
        if cursor == 0:
            break
    return count
