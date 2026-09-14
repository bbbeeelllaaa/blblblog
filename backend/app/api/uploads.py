from pathlib import Path
from urllib.parse import quote
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.deps import require_admin

router = APIRouter(prefix="/upload", tags=["uploads"])
settings = get_settings()
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".md", ".csv", ".json", ".zip", ".rar", ".7z", ".tar", ".gz",
}


@router.post("/file", dependencies=[Depends(require_admin)])
async def upload_file(file: UploadFile = File(...)):
    filename = Path((file.filename or "").replace("\\", "/")).name
    if Path(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Unsupported file type. Upload a document or archive.")
    if any(ord(char) < 32 for char in filename):
        raise HTTPException(400, "Invalid filename")

    content = await file.read(settings.MAX_UPLOAD_SIZE + 1)
    if not content:
        raise HTTPException(400, "File is empty")
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(400, f"File too large (max {settings.MAX_UPLOAD_SIZE // (1024 * 1024)} MB)")

    directory = Path(settings.UPLOAD_DIR) / "attachments"
    directory.mkdir(parents=True, exist_ok=True)
    file_id = uuid4()
    (directory / str(file_id)).write_bytes(content)
    return {
        "url": f"/api/upload/files/{file_id}/{quote(filename, safe='')}",
        "name": filename,
        "size": len(content),
    }


@router.get("/files/{file_id}/{filename}")
async def download_file(file_id: UUID, filename: str):
    path = Path(settings.UPLOAD_DIR) / "attachments" / str(file_id)
    if not path.is_file():
        raise HTTPException(404, "File not found")
    return FileResponse(
        path, filename=filename, media_type="application/octet-stream",
        headers={"X-Content-Type-Options": "nosniff"},
    )
