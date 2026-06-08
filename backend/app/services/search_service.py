from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.article import Article


def _build_tsquery(query: str) -> str | None:
    """Build a tsquery string from user query, using jieba for Chinese segmentation.
    Uses OR (|) for better recall. Returns None if no valid tokens."""
    import jieba
    words = [w for w in jieba.cut(query.strip()) if len(w.strip()) >= 1]
    if not words:
        return None
    return " | ".join(word + ":*" for word in words)


async def hybrid_search(
    db: AsyncSession, query: str, page: int = 1, size: int = 20, tag: str | None = None
) -> tuple[list[Article], int]:
    """Hybrid search: full-text (tsvector) + semantic (pgvector) combined."""
    tsquery = _build_tsquery(query)
    if tsquery is None:
        return await fulltext_search(db, query, page, size, tag)

    embedding = await _get_embedding(query)
    if embedding is None:
        return await fulltext_search(db, query, page, size, tag)

    tag_join = ""
    tag_where = ""
    if tag:
        tag_join = "JOIN article_tag_association ata ON a.id = ata.article_id JOIN article_tags t ON ata.tag_id = t.id"
        tag_where = "AND t.name = :tag"

    sql = text(f"""
        WITH fts_results AS (
            SELECT a.id,
                   ts_rank(a.search_vector, to_tsquery('simple', :tsquery)) AS fts_rank
            FROM articles a
            {tag_join}
            WHERE a.search_vector @@ to_tsquery('simple', :tsquery)
              AND a.is_published = true
              {tag_where}
        ),
        vec_results AS (
            SELECT a.id,
                   1.0 - (a.embedding <=> :query_embedding) AS vec_sim
            FROM articles a
            {tag_join}
            WHERE a.embedding IS NOT NULL
              AND a.is_published = true
              {tag_where}
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

    params = {
        "tsquery": tsquery,
        "query_embedding": embedding,
        "offset": (page - 1) * size,
        "limit": size,
    }
    if tag:
        params["tag"] = tag

    result = await db.execute(sql, params)

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
    db: AsyncSession, query: str, page: int = 1, size: int = 20, tag: str | None = None
) -> tuple[list[Article], int]:
    """Search articles by title, summary, and content using ILIKE."""
    like_pattern = f"%{query}%"

    tag_join = ""
    tag_where = ""
    if tag:
        tag_join = "JOIN article_tag_association ata ON a.id = ata.article_id JOIN article_tags t ON ata.tag_id = t.id"
        tag_where = "AND t.name = :tag"

    count_sql = text(f"""
        SELECT COUNT(*) FROM articles a
        {tag_join}
        WHERE a.is_published = true
          AND (a.title ILIKE :q OR a.summary ILIKE :q OR a.content ILIKE :q)
          {tag_where}
    """)
    count_params = {"q": like_pattern}
    if tag:
        count_params["tag"] = tag
    count_result = await db.execute(count_sql, count_params)
    total = count_result.scalar() or 0

    sql = text(f"""
        SELECT a.id,
               (CASE WHEN a.title ILIKE :q THEN 3.0 ELSE 0.0 END +
                CASE WHEN a.summary ILIKE :q THEN 2.0 ELSE 0.0 END +
                CASE WHEN a.content ILIKE :q THEN 1.0 ELSE 0.0 END) AS relevance
        FROM articles a
        {tag_join}
        WHERE a.is_published = true
          AND (a.title ILIKE :q OR a.summary ILIKE :q OR a.content ILIKE :q)
          {tag_where}
        ORDER BY relevance DESC, a.created_at DESC
        OFFSET :offset LIMIT :limit
    """)

    params = {
        "q": like_pattern,
        "offset": (page - 1) * size,
        "limit": size,
    }
    if tag:
        params["tag"] = tag

    result = await db.execute(sql, params)

    rows = result.fetchall()
    if not rows:
        return [], total

    id_relevance = {row.id: float(row.relevance) / 6.0 for row in rows}
    ids = list(id_relevance.keys())
    articles_result = await db.execute(
        select(Article)
        .where(Article.id.in_(ids))
        .options(selectinload(Article.tags), selectinload(Article.author))
    )
    articles_map = {a.id: a for a in articles_result.scalars().unique().all()}

    articles = []
    for aid in ids:
        a = articles_map.get(aid)
        if a:
            a._relevance = id_relevance[aid]
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
    summary_seg = " ".join(jieba.cut(article.summary or ""))
    content_seg = " ".join(jieba.cut(article.content[:5000]))

    sql = text("""
        UPDATE articles
        SET search_vector = to_tsvector('simple', :text)
        WHERE id = :id
    """)
    await db.execute(sql, {"text": f"{title_seg} {summary_seg} {content_seg}", "id": article.id})


async def update_embedding(db: AsyncSession, article: Article) -> None:
    """Update article embedding vector."""
    embedding = await _get_embedding(f"{article.title}\n{article.content[:2000]}")
    if embedding:
        article.embedding = embedding
        await db.flush()
