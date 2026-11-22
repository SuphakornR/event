import base64
import os
import sys
import tempfile
import threading
from typing import Optional

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import snapshot_download
from pydantic import BaseModel

MODEL_ID = os.getenv("OPENTHAI_MODEL_ID", "iapp/OpenThai2.1-OCR-Text-20261118")
MODEL_DIR = os.getenv("OPENTHAI_MODEL_DIR", "/app/model")
OCR_API_KEY = os.getenv("OCR_API_KEY", "").strip()
OCR_THREADS = max(1, int(os.getenv("OCR_THREADS", "2")))

_ocr_lock = threading.Lock()
_ocr_engine = None


def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine
    with _ocr_lock:
        if _ocr_engine is not None:
            return _ocr_engine
        if not os.path.isdir(MODEL_DIR) or not os.path.exists(os.path.join(MODEL_DIR, "config.json")):
            snapshot_download(repo_id=MODEL_ID, local_dir=MODEL_DIR)
        abs_dir = os.path.abspath(MODEL_DIR)
        if abs_dir not in sys.path:
            sys.path.insert(0, abs_dir)
        from runtime.line_engine import LineOCR
        _ocr_engine = LineOCR(abs_dir, threads=OCR_THREADS)
        return _ocr_engine


app = FastAPI(title="HelpDai OpenThai OCR Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class Base64OcrRequest(BaseModel):
    imageBase64: str


def verify_key(authorization: Optional[str]):
    if not OCR_API_KEY:
        return
    expected = f"Bearer {OCR_API_KEY}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def run_ocr_bytes(raw_bytes: bytes, suffix: str = ".png"):
    if not raw_bytes or len(raw_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image empty or exceeds 10MB")
    engine = get_ocr_engine()
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(raw_bytes)
        result = engine.read(tmp_path) or {}
        lines = [str(item.get("text", "")).strip() for item in result.get("lines", []) if item.get("text")]
        return {
            "ok": True,
            "model": MODEL_ID,
            "lines": lines,
            "text": "\n".join(lines),
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/health")
def health():
    return {"ok": True, "service": "openthai-ocr", "model": MODEL_ID}


@app.post("/ocr")
async def ocr_endpoint(
    file: Optional[UploadFile] = File(default=None),
    authorization: Optional[str] = Header(default=None),
):
    verify_key(authorization)
    if file is None:
        raise HTTPException(status_code=400, detail="Multipart 'file' is required")
    raw = await file.read()
    ext = os.path.splitext(file.filename or "")[1] or ".png"
    return run_ocr_bytes(raw, suffix=ext)


@app.post("/ocr/base64")
def ocr_base64_endpoint(
    payload: Base64OcrRequest,
    authorization: Optional[str] = Header(default=None),
):
    verify_key(authorization)
    data = payload.imageBase64.strip()
    suffix = ".png"
    if data.startswith("data:"):
        header, _, b64 = data.partition(",")
        if "jpeg" in header or "jpg" in header:
            suffix = ".jpg"
        elif "webp" in header:
            suffix = ".webp"
        data = b64
    try:
        raw = base64.b64decode(data, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image") from exc
    return run_ocr_bytes(raw, suffix=suffix)
