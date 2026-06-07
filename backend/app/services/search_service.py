from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.article import Article


async def hybrid_search(
    db: AsyncSession, query: str, page: int = 1, size: int = 20
) -> tuple[list[Article], int]:
    """Hybrid search: full-text (tsvector) + semantic (pgvector) combined."""
    tsquery = " & ".join(
        word + ":*" for word in query.strip().split() if len(word) >= 1
    )

    sql = text("""
        WITH fts_results AS (
            SELECT a.id,
                   ts_rank(a.search_vector, to_tsquery('simple', :tsquery)) AS fts_rank
            FROM articles a
            WHERE a.search_vector @@ to_tsquery('simple', :tsquery)
              AND a.is_published = true
        ),
        vec_results AS (
            SELECT a.id,
                   1.0 - (a.embedding <=> :query_embedding) AS vec_sim
            FROM articles a
            WHERE a.embedding IS NOT NULL
              AND a.is_published = true
            ORDER BY a.embedding <=> :query_embedding
            LIMIT 50
        ),
        combined AS (
            SELECT
                COALESCE(f.id, v.id) AS id,
                COALESCE(f.fts_rank, 0.0) AS fts_rank,
                COALESCE(v.vec_sim, 0.0) AS vec_sim,
                COALESCE(f.fts_rank, 0.0) * 4.0 + COALESCE(v.vec_sim, 0.0) AS hybrid_score
            FROM fts_results f
            FULL OUTER JOIN vec_results v ON f.id = v.id
        )
        SELECT c.id, c.hybrid_score, COUNT(*) OVER() AS total
        FROM combined c
        ORDER BY c.hybrid_score DESC
        OFFSET :offset LIMIT :limit
    """)

    embedding = await _get_embedding(query)

    if embedding is None:
        return await fulltext_search(db, query, page, size)

    result = await db.execute(sql, {
        "tsquery": tsquery,
        "query_embedding": embedding,
        "offset": (page - 1) * size,
        "limit": size,
    })

    rows = result.fetchall()
    if not rows:
        return [], 0

    total = rows[0].total if hasattr(rows[0], "total") else len(rows)
    ids = [row.id for row in rows]

    articles_result = await db.execute(
        select(Article)
        .where(Article.id.in_(ids))
        .options(selectinload(Article.tags), selectinload(Article.author))
    )
    articles_map = {a.id: a for a in articles_result.scalars().unique().all()}

    articles = []
    for row in rows:
        a = articles_map.get(row.id)
        if a:
            a._relevance = row.hybrid_score
            articles.append(a)

    return articles, total


async def fulltext_search(
    db: AsyncSession, query: str, page: int = 1, size: int = 20
) -> tuple[list[Article], int]:
    """Fallback full-text search when pgvector is not available."""
    tsquery = " & ".join(
        word + ":*" for word in query.strip().split() if len(word) >= 1
    )

    count_sql = text("""
        SELECT COUNT(*) FROM articles
        WHERE search_vector @@ to_tsquery('simple', :tsquery)
          AND is_published = true
    """)
    count_result = await db.execute(count_sql, {"tsquery": tsquery})
    total = count_result.scalar() or 0

    sql = text("""
        SELECT id, ts_rank(search_vector, to_tsquery('simple', :tsquery)) AS rank
        FROM articles
        WHERE search_vector @@ to_tsquery('simple', :tsquery)
          AND is_published = true
        ORDER BY rank DESC
        OFFSET :offset LIMIT :limit
    """)

    result = await db.execute(sql, {
        "tsquery": tsquery,
        "offset": (page - 1) * size,
        "limit": size,
    })

    rows = result.fetchall()
    if not rows:
        return [], total

    ids = [row.id for row in rows]
    articles_result = await db.execute(
        select(Article)
        .where(Article.id.in_(ids))
        .options(selectinload(Article.tags), selectinload(Article.author))
    )
    articles_map = {a.id: a for a in articles_result.scalars().unique().all()}

    articles = []
    for row in rows:
        a = articles_map.get(row.id)
        if a:
            a._relevance = row.rank
            articles.append(a)

    return articles, total


async def _get_embedding(text: str) -> list[float] | None:
    """Get embedding from OpenAI-compatible API. Returns None if unavailable."""
    import httpx
    from app.core.config import get_settings
    settings = get_settings()
    if not settings.AI_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.AI_API_BASE}/embeddings",
                headers={"Authorization": f"Bearer {settings.AI_API_KEY}"},
                json={"input": text, "model": "text-embedding-3-small"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["data"][0]["embedding"]
    except Exception:
        pass
    return None


async def update_search_vector(db: AsyncSession, article: Article) -> None:
    """Update tsvector from title and content with jieba segmentation."""
    import jieba
    title_seg = " ".join(jieba.cut(article.title))
    content_seg = " ".join(jieba.cut(article.content[:5000]))

    sql = text("""
        UPDATE articles
        SET search_vector = to_tsvector('simple', :text)
        WHERE id = :id
    """)
    await db.execute(sql, {"text": f"{title_seg} {content_seg}", "id": article.id})


async def update_embedding(db: AsyncSession, article: Article) -> None:
    """Update article embedding vector."""
    embedding = await _get_embedding(f"{article.title}\n{article.content[:2000]}")
    if embedding:
        article.embedding = embedding
        await db.flush()
