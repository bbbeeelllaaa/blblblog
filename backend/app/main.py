import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.utils.logging import setup_logging
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.articles import router as articles_router
from app.api.comments import router as comments_router
from app.api.likes import router as likes_router
from app.api.favorites import router as favorites_router
from app.api.search import router as search_router
from app.api.online import router as online_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="MyBlog API",
    description="Personal Blog System API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(articles_router)
app.include_router(comments_router)
app.include_router(likes_router)
app.include_router(favorites_router)
app.include_router(search_router)
app.include_router(online_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
