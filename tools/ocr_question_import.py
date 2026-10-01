"""OCR PDF/image question sheets into reviewable question records."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from urllib.parse import unquote, urlsplit


QUESTION_START = re.compile(
    r"(?m)^\s*(?:#{1,6}\s*)?(?:(?:question|q|câu)\s*)?(\d{1,3})[.)]\s+"
    r"(?=\S)",
    re.IGNORECASE,
)
OPTION_START = re.compile(r"^\s*(?:[-*]\s*)?(?:\*\*)?([A-H])(?:\*\*)?[.)\:]\s+(.*)$", re.IGNORECASE)
MARKDOWN_IMAGE = re.compile(r"(!\[[^\]]*\]\()([^)]+)(\))")
INLINE_IMAGE = re.compile(r"<img\b[^>]*?src\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\s>]+))[^>]*>", re.IGNORECASE)


def _markdown_from_result(result, output_dir: Path) -> str:
    returned = result.to_markdown(str(output_dir))
    if isinstance(returned, str) and ("\n" in returned or "|" in returned):
        return returned

    candidates = sorted(output_dir.rglob("*.md"))
    if candidates:
        preferred = next((path for path in candidates if path.name.lower() == "output.md"), candidates[0])
        return preferred.read_text(encoding="utf-8")
    if isinstance(returned, str):
        possible_path = output_dir / returned
        if possible_path.is_file():
            return possible_path.read_text(encoding="utf-8")
    raise ValueError("OCR completed but did not produce Markdown output")


def _rewrite_image_links(markdown: str, markdown_dir: Path, asset_prefix: str) -> tuple[str, list[dict]]:
    media = []

    def rewrite(source: str) -> str:
        decoded = unquote(source.strip())
        parsed = urlsplit(decoded)
        if parsed.scheme or decoded.startswith("//") or decoded.startswith("#"):
            media.append({"source": source, "kind": "remote" if parsed.scheme != "data" else "data"})
            return source

        local_path = (markdown_dir / parsed.path).resolve()
        try:
            relative = local_path.relative_to(markdown_dir.resolve())
        except ValueError:
            media.append({"source": source, "kind": "unresolved"})
            return source
        if not local_path.is_file():
            media.append({"source": source, "kind": "unresolved"})
            return source

        output_path = (Path(asset_prefix) / relative).as_posix()
        media.append({"source": source, "kind": "ocr-asset", "path": output_path})
        return output_path

    def markdown_sub(match):
        return f"{match.group(1)}{rewrite(match.group(2))}{match.group(3)}"

    def inline_sub(match):
        source = next((part for part in match.groups() if part is not None), "")
        return match.group(0).replace(source, rewrite(source), 1)

    markdown = MARKDOWN_IMAGE.sub(markdown_sub, markdown)
    markdown = INLINE_IMAGE.sub(inline_sub, markdown)
    return markdown, media


def _split_question_blocks(markdown: str) -> tuple[str, list[tuple[int, str]]]:
    starts = list(QUESTION_START.finditer(markdown))
    if not starts:
        return "", [(1, markdown.strip())] if markdown.strip() else []

    preamble = markdown[:starts[0].start()].strip()
    questions = []
    for index, match in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(markdown)
        body_start = match.end()
        body = markdown[body_start:end].strip()
        questions.append((int(match.group(1)), body))
    return preamble, questions


def _parse_options(markdown: str) -> tuple[str, dict[str, str], str | None]:
    lines = markdown.splitlines()
    option_start = next((i for i, line in enumerate(lines) if OPTION_START.match(line)), None)
    if option_start is None:
        return markdown.strip(), {}, None

    prompt = "\n".join(lines[:option_start]).strip()
    options = {}
    supplement = []
    current = None
    after_blank = False
    for line in lines[option_start:]:
        match = OPTION_START.match(line)
        if match:
            current = match.group(1).upper()
            options[current] = match.group(2).strip()
            after_blank = False
        elif current and line.strip():
            if after_blank:
                supplement.append(line.rstrip())
            else:
                options[current] += "\n" + line.strip()
        elif current and not line.strip():
            after_blank = True
    return prompt, options, "\n".join(supplement).strip() or None


def _question_type(options: dict[str, str]) -> str:
    return "multiple_choice" if len(options) >= 2 else "free_response"


def _formatting_features(markdown: str, media: list[dict]) -> list[str]:
    features = ["markdown"]
    if re.search(r"\$[^\n$]+\$|\\\(|\\\[|\\begin\{", markdown):
        features.append("latex")
    if re.search(r"(?:^|\n)\s*\|[^\n]*\||(?:^|\n)[^\n]*\|[^\n]*\n[^\n]*\|", markdown):
        features.append("table-markdown")
    if media:
        features.append("images")
    return features


def recognize_source(source_path: Path, markdown_dir: Path) -> str:
    try:
        from pix2text import Pix2Text
    except ImportError as error:
        raise RuntimeError(
            "OCR requires Pix2Text. Install it with: "
            "python3 -m pip install -r tools/requirements-ocr.txt"
        ) from error

    engine = Pix2Text.from_config()
    extension = source_path.suffix.lower()
    if extension == ".pdf":
        result = engine.recognize_pdf(str(source_path))
    elif extension in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"}:
        result = engine.recognize_page(str(source_path))
    else:
        raise ValueError(f"Unsupported OCR input type: {extension}")
    return _markdown_from_result(result, markdown_dir)


def export_ocr_file(source_path: Path, subject: str, output_path: Path, start: int | None = None, end: int | None = None) -> int:
    asset_dir = output_path.with_name(f"{output_path.stem}.assets")
    markdown_dir = asset_dir / "ocr"
    markdown_dir.mkdir(parents=True, exist_ok=True)

    original_dir = asset_dir / "source"
    original_dir.mkdir(parents=True, exist_ok=True)
    original_copy = original_dir / source_path.name
    if source_path.resolve() != original_copy.resolve():
        shutil.copy2(source_path, original_copy)

    markdown = recognize_source(source_path, markdown_dir)
    markdown, media = _rewrite_image_links(markdown, markdown_dir, f"{asset_dir.name}/ocr")
    preamble, chunks = _split_question_blocks(markdown)
    first = start or 1
    last = end or len(chunks)
    if first < 1 or last < first:
        raise ValueError("Question range must be positive and --end must be >= --start")

    questions = []
    for number, raw_markdown in chunks:
        if number < first or number > last:
            continue
        prompt, options, supplement = _parse_options(raw_markdown)
        question_media = [
            item for item in media
            if (item.get("path") and item["path"] in raw_markdown) or item["source"] in raw_markdown
        ]
        source_data = {
            "question": prompt,
            "options": options or None,
            "supplement": supplement,
            "answer": None,
            "explanation": None,
            "ocrMarkdown": raw_markdown,
        }
        questions.append({
            "number": number,
            "id": number,
            "type": _question_type(options),
            "question": prompt,
            "passage": None,
            "options": options or None,
            "supplement": supplement,
            "answer": None,
            "explanation": None,
            "ocrMarkdown": raw_markdown,
            "formatting": _formatting_features(raw_markdown, question_media),
            "media": question_media,
            "sourceData": source_data,
        })

    document = {
        "schemaVersion": 1,
        "subject": subject,
        "source": {
            "file": source_path.name,
            "path": str(source_path.resolve()),
            "format": source_path.suffix.lower().lstrip("."),
            "originalCopy": (Path(asset_dir.name) / "source" / source_path.name).as_posix(),
        },
        "questionCount": len(questions),
        "preamble": preamble or None,
        "ocrEngine": "Pix2Text",
        "ocrMarkdown": markdown,
        "media": media,
        "questions": questions,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(questions)