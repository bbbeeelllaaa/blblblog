import json
import re

from pydantic import AfterValidator, BaseModel, Field
from datetime import datetime
from typing import Annotated, Any, Literal

Category = Literal["tech", "study", "life"]
ARTICLE_NODE_TYPES = {
    "doc", "text", "paragraph", "heading", "blockquote", "bulletList", "orderedList", "listItem",
    "taskList", "taskItem", "codeBlock", "hardBreak", "horizontalRule", "image", "table", "tableRow",
    "tableHeader", "tableCell", "contentCard", "video", "attachment",
}
ARTICLE_MARK_TYPES = {"bold", "italic", "strike", "underline", "code", "link", "textStyle", "highlight"}
STRING_ATTRIBUTES = {
    "src", "href", "cover", "poster", "title", "name", "alt", "description", "caption", "variant",
    "color", "backgroundColor", "fontFamily", "fontSize", "lineHeight", "textAlign", "align", "language",
    "target", "rel", "class", "type",
}
URL_ATTRIBUTES = {"src", "href", "cover", "poster"}
URL_SCHEMES = {"http", "https", "ftp", "ftps", "mailto", "tel", "callto", "sms", "cid", "xmpp"}


def _validate_document_attrs(attrs: dict) -> None:
    for key, value in attrs.items():
        if key in {"__proto__", "prototype", "constructor"} or isinstance(value, dict):
            raise ValueError("Article attributes cannot contain nested objects")
        if isinstance(value, list) and any(isinstance(item, (dict, list)) for item in value):
            raise ValueError("Article attribute arrays must contain scalar values")
        if value is None:
            continue
        if key in STRING_ATTRIBUTES and not isinstance(value, str):
            raise ValueError(f"Article attribute {key} must be a string")
        if key in {"width", "height", "size", "start", "level", "colspan", "rowspan"}:
            if type(value) not in (int, float) and not (key in {"width", "height"} and isinstance(value, str)):
                raise ValueError(f"Article attribute {key} must be numeric")
        if key == "checked" and not isinstance(value, bool):
            raise ValueError("Task checked state must be boolean")
        if key == "colwidth" and (not isinstance(value, list) or any(type(width) not in (int, float) or width < 0 for width in value)):
            # ProseMirror uses zero for columns without an explicit width in merged cells.
            raise ValueError("Table column widths must be nonnegative numbers")
        if key in URL_ATTRIBUTES:
            if any(ord(char) < 32 or ord(char) == 127 for char in value):
                raise ValueError("Article media and link URLs cannot contain control characters")
            scheme = re.match(r"^([a-z][a-z0-9+.-]*):", "".join(value.split()), re.I)
            if scheme and scheme[1].lower() not in URL_SCHEMES:
                raise ValueError("Article media and link URL scheme is not allowed")


def validate_content_json(document: dict[str, Any] | None) -> dict[str, Any] | None:
    if document is None:
        return None
    if document.get("type") != "doc" or not isinstance(document.get("content"), list):
        raise ValueError("Article document must be a doc with a content array")
    # Bound depth before serialization, including arbitrary attributes from extensions.
    pending = [(document, 0)]
    item_count = 0
    while pending:
        value, depth = pending.pop()
        item_count += 1
        if depth > 64 or item_count > 100000:
            raise ValueError("Article document is too deeply nested or complex")
        if isinstance(value, dict):
            if any(not isinstance(key, str) for key in value):
                raise ValueError("Article document keys must be strings")
            pending.extend((item, depth + 1) for item in value.values())
        elif isinstance(value, list):
            pending.extend((item, depth + 1) for item in value)
        elif value is not None and not isinstance(value, (str, int, float, bool)):
            raise ValueError("Article document must contain JSON values only")
    try:
        size = len(json.dumps(document, ensure_ascii=False, allow_nan=False).encode("utf-8"))
    except (TypeError, ValueError) as exc:
        raise ValueError("Article document contains invalid JSON values") from exc
    if size > 2 * 1024 * 1024:
        raise ValueError("Article document must be smaller than 2 MB")
    nodes = [document]
    count = 0
    while nodes:
        node = nodes.pop()
        count += 1
        if count > 20000:
            raise ValueError("Article document contains too many nodes")
        if not isinstance(node, dict) or not isinstance(node.get("type"), str) or not node["type"]:
            raise ValueError("Each article node must have a type")
        if node["type"] == "uploadPlaceholder":
            raise ValueError("Finish or remove pending uploads before saving the article")
        if node["type"] not in ARTICLE_NODE_TYPES:
            raise ValueError("Article document contains an unsupported node type")
        children = node.get("content", [])
        if not isinstance(children, list):
            raise ValueError("Article node content must be an array")
        attrs = node.get("attrs", {})
        if not isinstance(attrs, dict):
            raise ValueError("Article node attributes must be an object")
        if node["type"] == "text" and (not isinstance(node.get("text"), str) or not node["text"]):
            raise ValueError("Text nodes must contain nonempty text")
        marks = node.get("marks", [])
        if not isinstance(marks, list) or any(
            not isinstance(mark, dict) or not isinstance(mark.get("type"), str)
            or not isinstance(mark.get("attrs", {}), dict) for mark in marks
        ):
            raise ValueError("Article node marks must be typed objects")
        if attrs.get("uploadId") or str(attrs.get("src", "")).strip().lower().startswith("blob:"):
            raise ValueError("Finish or remove pending uploads before saving the article")
        _validate_document_attrs(attrs)
        for mark in marks:
            if mark["type"] not in ARTICLE_MARK_TYPES:
                raise ValueError("Article document contains an unsupported mark type")
            _validate_document_attrs(mark.get("attrs", {}))
        nodes.extend(children)
    return document


ArticleDocument = Annotated[dict[str, Any] | None, AfterValidator(validate_content_json)]


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TagResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ArticleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    content_json: ArticleDocument = None
    summary: str | None = None
    tags: list[str] = []
    category: Category
    is_published: bool = True


class ArticleUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    content: str | None = None
    content_json: ArticleDocument = None
    summary: str | None = None
    tags: list[str] | None = None
    category: Category | None = None
    is_published: bool | None = None


class ArticleListResponse(BaseModel):
    id: int
    title: str
    summary: str | None
    author_id: int
    author_name: str
    author_avatar: str | None
    category: str | None = None
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
    content_json: dict[str, Any] | None = None
    summary: str | None
    author_id: int
    author_name: str
    author_avatar: str | None
    category: str | None = None
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
