from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ArticleLike(Base):
    __tablename__ = "article_likes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", lazy="selectin")
    article = relationship("Article", back_populates="likes", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("user_id", "article_id", name="uq_article_like_user"),
    )


class CommentLike(Base):
    __tablename__ = "comment_likes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    comment_id: Mapped[int] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", lazy="selectin")
    comment = relationship("Comment", back_populates="likes", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("user_id", "comment_id", name="uq_comment_like_user"),
    )
