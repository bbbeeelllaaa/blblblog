import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
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
from app.api.admin import router as admin_router
from app.api.site import router as site_router
from app.api.guestbook import router as guestbook_router
from app.api.uploads import router as uploads_router

settings = get_settings()


class PublicUploadFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        parts = Path(path).parts
        if any(part.startswith(".") for part in parts) or (parts and parts[0].lower() == "attachments"):
            raise HTTPException(404, "File not found")
        response = await super().get_response(path, scope)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="blblblog API",
    description="blblblog System API",
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
app.mount("/uploads", PublicUploadFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(articles_router)
app.include_router(comments_router)
app.include_router(likes_router)
app.include_router(favorites_router)
app.include_router(search_router)
app.include_router(online_router)
app.include_router(admin_router)
app.include_router(site_router)
app.include_router(guestbook_router)
app.include_router(uploads_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
