"""Run with: python -m unittest test_article_documents (no database required)."""
import unittest
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from pydantic import ValidationError
from sqlalchemy.dialects.postgresql import dialect

from app.models.article import Article
from app.schemas.article import ArticleCreate, ArticleUpdate
from app.services import article_service, search_service


DOCUMENT = {
    "type": "doc", "content": [
        {"type": "contentCard", "attrs": {"variant": "note", "title": "重点"}, "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "正文", "marks": [{"type": "bold"}]}]}
        ]},
        {"type": "image", "attrs": {"src": "/api/upload/images/test.webp", "alt": "图解"}},
        {"type": "attachment", "attrs": {"src": "/api/upload/files/test.pdf", "name": "课件.pdf"}},
    ]
}


class ArticleDocumentTests(unittest.IsolatedAsyncioTestCase):
    def test_create_legacy_and_rich_documents(self):
        legacy = ArticleCreate(title="Legacy", content="# Existing", category="tech")
        self.assertIsNone(legacy.content_json)
        rich = ArticleCreate(title="Rich", content="<p>正文</p>", category="life", content_json=DOCUMENT)
        self.assertEqual(rich.content_json, DOCUMENT)
        self.assertNotIn("content_json", ArticleUpdate(title="Rename").model_dump(exclude_unset=True))
        self.assertIn("content_json", ArticleUpdate(content_json=None).model_dump(exclude_unset=True))
        self.assertIsNone(Article.__table__.c.content_json.type.bind_processor(dialect())(None))

    def test_reject_malformed_oversized_or_pending_documents(self):
        invalid = [
            {}, {"type": "paragraph", "content": []},
            {"type": "doc", "content": ["text"]},
            {"type": "doc", "content": [{"type": "text", "text": 12}]},
            {"type": "doc", "content": [{"type": "paragraph", "attrs": []}]},
            {"type": "doc", "content": [{"type": "text", "text": "x", "marks": ["bold"]}]},
            {"type": "doc", "content": [{"type": "uploadPlaceholder", "attrs": {"uploadId": "pending"}}]},
            {"type": "doc", "content": [{"type": "image", "attrs": {"src": "blob:unfinished"}}]},
            {"type": "doc", "content": [{"type": "video", "attrs": {"uploadId": "pending", "src": "/video.mp4"}}]},
            {"type": "doc", "content": [{"type": "text", "text": "x" * (2 * 1024 * 1024)}]},
            {"type": "doc", "content": [{"type": "paragraph", "attrs": {"width": float("nan")}}]},
        ]
        deep = {"type": "paragraph"}
        for _ in range(40):
            deep = {"type": "paragraph", "content": [deep]}
        invalid.append({"type": "doc", "content": [deep]})
        for document in invalid:
            with self.subTest(document=str(document)[:100]), self.assertRaises(ValidationError):
                ArticleUpdate(content_json=document)

    def test_visible_text_ignores_markup_and_media_urls(self):
        article = SimpleNamespace(content="<script>wrong</script>", content_json=DOCUMENT)
        self.assertEqual(article_service.get_article_text(article), "重点 正文 图解 课件.pdf")
        article.content_json = None
        self.assertEqual(article_service.get_article_text(article), "<script>wrong</script>")

    def test_supported_tiptap_attrs_and_security_boundaries(self):
        valid = {"type": "doc", "content": [
            {"type": "paragraph", "attrs": {"textAlign": "center"}, "content": [
                {"type": "text", "text": "Format", "marks": [
                    {"type": "textStyle", "attrs": {"color": "#bb3355", "fontFamily": "Georgia, serif", "fontSize": "18px", "backgroundColor": None, "lineHeight": None}},
                    {"type": "link", "attrs": {"href": "mailto:hello@example.com", "target": "_blank", "rel": "noopener noreferrer", "class": None, "title": None}},
                ]},
            ]},
            {"type": "table", "content": [{"type": "tableRow", "content": [
                {"type": "tableHeader", "attrs": {"colspan": 2, "rowspan": 1, "colwidth": [120, 0], "align": None}, "content": [{"type": "paragraph"}]},
            ]}]},
            {"type": "taskList", "content": [{"type": "taskItem", "attrs": {"checked": False}, "content": [{"type": "paragraph"}]}]},
            {"type": "image", "attrs": {"src": "/image.webp", "alt": None, "title": None, "width": 480, "height": None}},
            {"type": "video", "attrs": {"src": "/video.mp4", "poster": "", "title": "Video", "width": "480"}},
        ]}
        self.assertEqual(ArticleUpdate(content_json=valid).content_json, valid)
        invalid = [
            {"type": "unknownNode"}, {"type": "text", "text": ""},
            {"type": "contentCard", "attrs": {"title": 123}},
            {"type": "image", "attrs": {"src": {"url": "/image.webp"}}},
            {"type": "paragraph", "attrs": {"nested": {"__proto__": {}}}},
            {"type": "tableCell", "attrs": {"colwidth": [[120]]}},
            {"type": "taskItem", "attrs": {"checked": "false"}},
            {"type": "text", "text": "x", "marks": [{"type": "unknownMark"}]},
            {"type": "text", "text": "x", "marks": [{"type": "textStyle", "attrs": {"color": ["red"]}}]},
            {"type": "text", "text": "x", "marks": [{"type": "link", "attrs": {"href": "java\nscript:alert(1)"}}]},
            {"type": "image", "attrs": {"src": "javascript:alert(1)"}},
            {"type": "contentCard", "attrs": {"href": "data:text/html,bad"}},
        ]
        for node in invalid:
            with self.subTest(node=node), self.assertRaises(ValidationError):
                ArticleUpdate(content_json={"type": "doc", "content": [node]})

    async def test_partial_updates_preserve_or_clear_rich_documents(self):
        db = SimpleNamespace(flush=AsyncMock(), refresh=AsyncMock())
        article = SimpleNamespace(content="old", content_json=deepcopy(DOCUMENT), title="old")
        await article_service.update_article(db, article, {"title": "new"})
        self.assertEqual(article.content_json, DOCUMENT)
        await article_service.update_article(db, article, {"content": "Markdown edit"})
        self.assertIsNone(article.content_json)
        await article_service.update_article(db, article, {"content": "rich", "content_json": DOCUMENT})
        self.assertEqual(article.content_json, DOCUMENT)
        await article_service.update_article(db, article, {"content_json": None})
        self.assertIsNone(article.content_json)

    async def test_search_vector_and_embedding_use_visible_rich_text(self):
        article = SimpleNamespace(id=1, title="标题", summary=None, content="<p>wrong</p>", content_json=DOCUMENT)
        db = SimpleNamespace(execute=AsyncMock(), flush=AsyncMock())
        await search_service.update_search_vector(db, article)
        indexed = db.execute.call_args.args[1]["text"]
        self.assertIn("正", indexed)
        self.assertNotIn("wrong", indexed)
        self.assertNotIn("<p>", indexed)
        with patch.object(search_service, "_get_embedding", new_callable=AsyncMock, return_value=[0.1]) as embedding:
            await search_service.update_embedding(db, article)
            self.assertEqual(embedding.call_args.args[0], "标题\n重点 正文 图解 课件.pdf")


if __name__ == "__main__":
    unittest.main()
