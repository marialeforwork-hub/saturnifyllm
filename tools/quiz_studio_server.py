#!/usr/bin/env python3
"""Serve Question JSON Studio and its same-origin local Pix2Text endpoint."""

from __future__ import annotations

import base64
import mimetypes
import re
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse

from ocr_question_import import _markdown_from_result


ROOT = Path(__file__).resolve().parents[1]
STUDIO_HTML = Path(__file__).resolve().with_name("quiz_to_json.html")
IMAGE_LINK = re.compile(r"(!\[[^\]]*\]\()([^)]+)(\))")
IMAGE_TAG = re.compile(r"<img\b[^>]*?src\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\s>]+))[^>]*>", re.IGNORECASE)

app = FastAPI(title="SATurnify Question JSON Studio")
_pix2text = None


@app.get("/")
@app.get("/tools/quiz_to_json.html")
async def studio():
    return FileResponse(STUDIO_HTML)


@app.get("/health")
async def health():
    return {"status": "ok", "ocrLoaded": _pix2text is not None}


def get_engine():
    global _pix2text
    if _pix2text is None:
        try:
            from pix2text import Pix2Text
        except ImportError as error:
            raise RuntimeError(
                "Pix2Text chưa được cài. Chạy python3 -m pip install -r tools/requirements-ocr.txt"
            ) from error
        _pix2text = Pix2Text.from_config(enable_formula=True, enable_table=True, device="cpu")
    return _pix2text


def inline_ocr_images(markdown: str, output_dir: Path) -> tuple[str, list[dict]]:
    media = []

    def as_data_url(source: str) -> str:
        parsed = urlsplit(unquote(source.strip()))
        if parsed.scheme or source.startswith("//") or source.startswith("#"):
            return source
        path = (output_dir / parsed.path).resolve()
        try:
            path.relative_to(output_dir.resolve())
        except ValueError:
            media.append({"source": source, "kind": "unresolved"})
            return source
        if not path.is_file():
            media.append({"source": source, "kind": "unresolved"})
            return source
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        data_url = f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"
        media.append({"source": source, "kind": "embedded", "mime": mime, "size": path.stat().st_size})
        return data_url

    def markdown_image(match):
        return f"{match.group(1)}{as_data_url(match.group(2))}{match.group(3)}"

    def html_image(match):
        source = next((value for value in match.groups() if value is not None), "")
        return match.group(0).replace(source, as_data_url(source), 1)

    markdown = IMAGE_LINK.sub(markdown_image, markdown)
    markdown = IMAGE_TAG.sub(html_image, markdown)
    return markdown, media


def recognize_upload(content: bytes, filename: str, file_type: str, resized_shape: int) -> dict:
    suffix = Path(filename).suffix.lower()
    if suffix not in {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"}:
        raise ValueError(f"Không hỗ trợ loại file {suffix or '(không đuôi)'}. Hãy chọn PDF hoặc ảnh.")

    with tempfile.TemporaryDirectory(prefix="saturnify-ocr-") as temp_name:
        temp = Path(temp_name)
        source = temp / f"source{suffix}"
        source.write_bytes(content)
        output_dir = temp / "recognized"
        output_dir.mkdir()
        engine = get_engine()
        if suffix == ".pdf":
            result = engine.recognize_pdf(str(source))
        else:
            result = engine.recognize_page(str(source), resized_shape=resized_shape)
        markdown = _markdown_from_result(result, output_dir)
        markdown, media = inline_ocr_images(markdown, output_dir)
        return {
            "results": markdown,
            "file": filename,
            "file_type": "pdf" if suffix == ".pdf" else file_type,
            "media": media,
        }


@app.post("/api/ocr")
async def ocr_upload(
    image: UploadFile = File(...),
    file_type: str = Form(default="page"),
    resized_shape: int = Form(default=1024),
):
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="File tải lên đang trống.")
    try:
        return await run_in_threadpool(recognize_upload, content, image.filename or "scan", file_type, resized_shape)
    except (ValueError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)