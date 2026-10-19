import mimetypes
from pathlib import Path
from urllib.parse import quote
from uuid import UUID, uuid4

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.deps import get_current_user, require_admin

router = APIRouter(prefix="/upload", tags=["uploads"])
settings = get_settings()
CHUNK_SIZE = 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".md", ".csv", ".json", ".zip", ".rar", ".7z", ".tar", ".gz",
}
IMAGE_TYPES = {
    ".png": {"image/png"},
    ".jpg": {"image/jpeg", "image/jpg", "image/pjpeg"},
    ".jpeg": {"image/jpeg", "image/jpg", "image/pjpeg"},
    ".gif": {"image/gif"},
    ".webp": {"image/webp"},
    ".bmp": {"image/bmp", "image/x-ms-bmp"},
}
VIDEO_TYPES = {".mp4": {"video/mp4"}, ".webm": {"video/webm"}}


def safe_filename(file: UploadFile) -> str:
    filename = Path((file.filename or "").replace("\\", "/")).name
    if not filename or any(ord(char) < 32 or ord(char) == 127 for char in filename):
        raise HTTPException(400, "Invalid filename")
    return filename


def media_type(header: bytes, extension: str) -> str:
    """Match the file signature as well as the requested extension, never SVG/HTML."""
    if extension == ".png" and len(header) >= 24 and header.startswith(b"\x89PNG\r\n\x1a\n") and header[12:16] == b"IHDR":
        return "image/png"
    if extension in {".jpg", ".jpeg"} and header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if extension == ".gif" and len(header) >= 13 and header.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if extension == ".webp" and header[:4] == b"RIFF" and header[8:12] == b"WEBP" and header[12:16] in {b"VP8 ", b"VP8L", b"VP8X"}:
        return "image/webp"
    if extension == ".bmp" and len(header) >= 26 and header.startswith(b"BM"):
        return "image/bmp"
    if extension == ".mp4" and len(header) >= 16 and header[4:8] == b"ftyp":
        brands = {b"isom", b"iso2", b"iso3", b"iso4", b"iso5", b"iso6", b"mp41",
                  b"mp42", b"avc1", b"M4V ", b"dash", b"msdh", b"msix"}
        if header[8:12] in brands:
            return "video/mp4"
    if extension == ".webm" and header.startswith(b"\x1aE\xdf\xa3") and b"webm" in header[:4096]:
        return "video/webm"
    raise HTTPException(400, "File contents do not match the image or video format")


async def save_upload(file: UploadFile, request: Request, kind: str) -> dict:
    filename = safe_filename(file)
    extension = Path(filename).suffix.lower()
    limit = {
        "image": settings.MAX_IMAGE_UPLOAD_SIZE,
        "video": settings.MAX_VIDEO_UPLOAD_SIZE,
        "file": settings.MAX_FILE_UPLOAD_SIZE,
    }[kind]
    allowed = IMAGE_TYPES if kind == "image" else VIDEO_TYPES if kind == "video" else ALLOWED_EXTENSIONS
    if extension not in allowed:
        raise HTTPException(400, "Unsupported file type")
    mime = (file.content_type or "").lower().split(";", 1)[0].strip()
    if kind != "file" and mime not in {"", "application/octet-stream"}:
        if mime not in allowed[extension]:
            raise HTTPException(400, "Content type does not match the file extension")
    if file.size is not None and file.size > limit:
        raise HTTPException(413, f"File too large (max {limit // (1024 * 1024)} MB)")

    directory = Path(settings.UPLOAD_DIR) / "attachments" if kind == "file" else Path(settings.UPLOAD_DIR)
    file_id = uuid4()
    stored_name = str(file_id) if kind == "file" else f"{file_id.hex}{extension}"
    path = directory / stored_name
    partial = directory / f".{stored_name}.part"
    size = 0
    try:
        chunk = await file.read(min(CHUNK_SIZE, limit + 1))
        if not chunk:
            raise HTTPException(400, "File is empty")
        content_type = media_type(chunk, extension) if kind != "file" else (
            mimetypes.guess_type(filename)[0] or "application/octet-stream"
        )
        await run_in_threadpool(directory.mkdir, parents=True, exist_ok=True)
        async with aiofiles.open(partial, "xb") as destination:
            while chunk:
                size += len(chunk)
                if size > limit:
                    raise HTTPException(413, f"File too large (max {limit // (1024 * 1024)} MB)")
                if await request.is_disconnected():
                    raise HTTPException(499, "Upload cancelled")
                await destination.write(chunk)
                chunk = await file.read(min(CHUNK_SIZE, limit - size + 1))
        if await request.is_disconnected():
            raise HTTPException(499, "Upload cancelled")
        await run_in_threadpool(partial.replace, path)
    except BaseException:
        # The final filename is only published after every chunk has been validated.
        partial.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    return {
        "url": f"/api/upload/files/{file_id}/{quote(filename, safe='')}" if kind == "file" else f"/uploads/{stored_name}",
        "name": filename,
        "size": size,
        "type": content_type,
    }


@router.get("/limits", dependencies=[Depends(get_current_user)])
async def upload_limits():
    return {
        "image": settings.MAX_IMAGE_UPLOAD_SIZE,
        "video": settings.MAX_VIDEO_UPLOAD_SIZE,
        "file": settings.MAX_FILE_UPLOAD_SIZE,
        "avatar": settings.MAX_UPLOAD_SIZE,
    }


@router.post("/image", dependencies=[Depends(get_current_user)])
async def upload_image(request: Request, file: UploadFile = File(...)):
    return await save_upload(file, request, "image")


@router.post("/video", dependencies=[Depends(require_admin)])
async def upload_video(request: Request, file: UploadFile = File(...)):
    return await save_upload(file, request, "video")


@router.post("/file", dependencies=[Depends(require_admin)])
async def upload_file(request: Request, file: UploadFile = File(...)):
    return await save_upload(file, request, "file")


@router.get("/files/{file_id}/{filename}")
async def download_file(file_id: UUID, filename: str):
    path = Path(settings.UPLOAD_DIR) / "attachments" / str(file_id)
    if not path.is_file():
        raise HTTPException(404, "File not found")
    return FileResponse(
        path, filename=filename, media_type="application/octet-stream",
        headers={"X-Content-Type-Options": "nosniff"},
    )
