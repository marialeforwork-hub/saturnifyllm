"""Shared HTML quiz-data extraction and JSON export helpers."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

import json5


ARRAY_DECLARATION = re.compile(
    r"\b(?:const|let|var)\s+(?:quizData|quizQuestions|questions|questionData)\s*=",
    re.IGNORECASE,
)
MEDIA_TAG = re.compile(r"<(?:img|image|source)\b[^>]*>", re.IGNORECASE)
MEDIA_ATTRIBUTE = re.compile(
    r"\b(?:src|href|xlink:href)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))",
    re.IGNORECASE,
)
MEDIA_FIELD = re.compile(r"(?:image|figure|diagram|media|asset)(?:url|src|path)?$", re.IGNORECASE)
HTML_TAG = re.compile(r"</?[a-z][^>]*>", re.IGNORECASE)
LATEX_MARKER = re.compile(r"\$[^\n$]+\$|\\\(|\\\[|\\begin\{(?:array|matrix|aligned)", re.IGNORECASE)
TABLE_MARKER = re.compile(r"<table\b|(?:^|\n)\s*\|[^\n]*\||(?:^|\n)[^\n]*\|[^\n]*\n[^\n]*\|", re.IGNORECASE)
IMAGE_EXTENSION = re.compile(r"\.(?:avif|gif|jpe?g|png|svg|webp)(?:$|[?#])", re.IGNORECASE)


def _skip_space_and_comments(source: str, index: int) -> int:
    while index < len(source):
        if source[index].isspace():
            index += 1
        elif source.startswith("//", index):
            newline = source.find("\n", index + 2)
            index = len(source) if newline < 0 else newline + 1
        elif source.startswith("/*", index):
            end = source.find("*/", index + 2)
            if end < 0:
                raise ValueError("Unclosed comment while reading quiz data")
            index = end + 2
        else:
            break
    return index


def _array_end(source: str, start: int) -> int | None:
    depth = 0
    quote = ""
    escaped = False
    index = start

    while index < len(source):
        char = source[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = ""
            index += 1
            continue

        if source.startswith("//", index):
            newline = source.find("\n", index + 2)
            index = len(source) if newline < 0 else newline + 1
            continue
        if source.startswith("/*", index):
            end = source.find("*/", index + 2)
            if end < 0:
                return None
            index = end + 2
            continue
        if char in "\"'`":
            quote = char
        elif char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return index + 1
        index += 1
    return None


def extract_question_array(source: str) -> list:
    candidates = []
    for declaration in ARRAY_DECLARATION.finditer(source):
        start = _skip_space_and_comments(source, declaration.end())
        if start >= len(source) or source[start] != "[":
            continue
        end = _array_end(source, start)
        if end is None:
            continue
        try:
            value = json5.loads(source[start:end])
        except ValueError:
            continue
        if isinstance(value, list) and value and all(isinstance(item, (dict, str)) for item in value):
            candidates.append(value)

    if not candidates:
        raise ValueError("No static quizData/questions array found in the HTML file")
    return max(candidates, key=len)


def get_title(source: str, fallback: str) -> str:
    match = re.search(r"<title\b[^>]*>(.*?)</title\s*>", source, re.IGNORECASE | re.DOTALL)
    if not match:
        return fallback
    return html.unescape(HTML_TAG.sub("", match.group(1))).strip() or fallback


def iter_strings(value, path=()):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for key, child in value.items():
            yield from iter_strings(child, (*path, str(key)))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from iter_strings(child, (*path, str(index)))


def find_media_references(question: dict) -> list[dict]:
    found = []
    seen = set()
    for path, value in iter_strings(question):
        for tag in MEDIA_TAG.findall(value):
            match = MEDIA_ATTRIBUTE.search(tag)
            if match:
                source = next((part for part in match.groups() if part is not None), "").strip()
                if source and source not in seen:
                    seen.add(source)
                    found.append({"source": source, "field": ".".join(path)})

        if path and MEDIA_FIELD.search(path[-1]) and IMAGE_EXTENSION.search(value.strip()):
            source = value.strip()
            if source not in seen:
                seen.add(source)
                found.append({"source": source, "field": ".".join(path)})
    return found


def bundle_media(references: list[dict], source_path: Path, output_path: Path) -> dict[str, str]:
    replacements = {}
    asset_dir = output_path.with_name(f"{output_path.stem}.assets")

    for reference in references:
        source = reference["source"]
        parsed = urlsplit(source)
        if parsed.scheme or source.startswith("//") or source.startswith("#"):
            reference["kind"] = "data" if parsed.scheme == "data" else "remote"
            continue

        asset_path = (source_path.parent / unquote(parsed.path)).resolve()
        if not asset_path.is_file():
            reference["kind"] = "unresolved"
            continue

        digest = hashlib.sha256(str(asset_path).encode("utf-8")).hexdigest()[:10]
        filename = f"{digest}_{asset_path.name}"
        asset_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(asset_path, asset_dir / filename)
        bundled_path = (Path(asset_dir.name) / filename).as_posix()
        reference["kind"] = "local"
        reference["path"] = bundled_path
        replacements[source] = bundled_path

    return replacements


def rewrite_media(value, replacements: dict[str, str]):
    if isinstance(value, str):
        for original, bundled in replacements.items():
            value = value.replace(original, bundled)
        return value
    if isinstance(value, list):
        return [rewrite_media(item, replacements) for item in value]
    if isinstance(value, dict):
        return {key: rewrite_media(item, replacements) for key, item in value.items()}
    return value


def formatting_features(question: dict, media: list[dict]) -> list[str]:
    text = "\n".join(value for _, value in iter_strings(question))
    features = []
    if HTML_TAG.search(text):
        features.append("html")
    if LATEX_MARKER.search(text):
        features.append("latex")
    if TABLE_MARKER.search(text):
        features.append("table-markdown-or-html")
    if media:
        features.append("images")
    return features


def _first_value(question: dict, keys: tuple[str, ...]):
    for key in keys:
        if key in question:
            return question[key]
    return None


def normalize_question(question, index: int, source_path: Path, output_path: Path) -> dict:
    raw = question if isinstance(question, dict) else {"text": str(question)}
    media = find_media_references(raw)
    replacements = bundle_media(media, source_path, output_path)
    options = _first_value(raw, ("options", "choices", "answers"))
    prompt = _first_value(raw, ("question", "text", "prompt", "content"))
    passage = _first_value(raw, ("passage", "context", "stimulus"))
    answer = _first_value(raw, ("answer", "correctAnswer", "correct_answer", "key"))
    explanation = _first_value(raw, ("explanation", "rationale", "solution"))

    return {
        "number": index,
        "id": raw.get("id", raw.get("question_number", index)),
        "type": raw.get("type") or ("multiple_choice" if options else "free_response"),
        "question": rewrite_media(prompt, replacements),
        "passage": rewrite_media(passage, replacements),
        "options": rewrite_media(options, replacements),
        "answer": answer,
        "explanation": rewrite_media(explanation, replacements),
        "formatting": formatting_features(raw, media),
        "media": media,
        "sourceData": raw,
    }


def choose_question_range(source_path: Path, questions: list, subject: str, args) -> list[tuple[int, object]]:
    first = args.start or 1
    last = args.end or len(questions)
    if not args.start and not args.end and not args.all_questions and subject in {"verbal", "math"}:
        if source_path.stem.upper().startswith("ELITEX") and len(questions) == 98:
            first, last = (1, 54) if subject == "verbal" else (55, 98)
    if first < 1 or last < first:
        raise ValueError("Question range must be positive and --end must be >= --start")
    return [(index, question) for index, question in enumerate(questions, 1) if first <= index <= last]


def export_file(source_path: Path, subject: str, output_path: Path, args) -> int:
    source = source_path.read_text(encoding="utf-8-sig")
    questions = extract_question_array(source)
    selected = choose_question_range(source_path, questions, subject, args)
    normalized = [normalize_question(question, index, source_path, output_path) for index, question in selected]
    document = {
        "schemaVersion": 1,
        "subject": subject,
        "source": {"file": source_path.name, "title": get_title(source, source_path.stem)},
        "questionCount": len(normalized),
        "questions": normalized,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(normalized)


def export_source(source_path: Path, subject: str, output_path: Path, args) -> int:
    if source_path.suffix.lower() in {".html", ".htm"}:
        return export_file(source_path, subject, output_path, args)

    from ocr_question_import import export_ocr_file

    return export_ocr_file(source_path, subject, output_path, args.start, args.end)


def run_cli(subject: str, argv=None) -> int:
    parser = argparse.ArgumentParser(
        description=f"Export SATurnify {subject} quiz question data to JSON while preserving rich source content."
    )
    parser.add_argument("sources", nargs="+", type=Path, help="One or more quiz HTML files")
    parser.add_argument("-o", "--output", type=Path, help="Output JSON path (only for one input file)")
    parser.add_argument("--start", type=int, help="First source question number to include (1-based)")
    parser.add_argument("--end", type=int, help="Last source question number to include (inclusive)")
    parser.add_argument("--all-questions", action="store_true", help="Disable the default Elite 98-question split")
    args = parser.parse_args(argv)

    if args.output and len(args.sources) != 1:
        parser.error("--output can only be used with one source file")

    try:
        for source_path in args.sources:
            if not source_path.is_file():
                raise FileNotFoundError(f"Input file not found: {source_path}")
            output_path = args.output or source_path.with_name(f"{source_path.stem}.{subject}.json")
            count = export_source(source_path, subject, output_path, args)
            print(f"{source_path} -> {output_path} ({count} questions)")
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Export failed: {error}", file=sys.stderr)
        return 1
    return 0


def infer_subject(source_path: Path) -> str:
    name = source_path.stem.lower().replace("_", " ").replace("-", " ")
    if re.search(r"\belite\s*x?\s*\d+\b", name):
        return "mixed"
    if re.search(r"word in context|\bwic\b|stunote|rhetorical|transitions?|boundaries|form structure|reading and writing|verbal|english", name):
        return "verbal"
    if re.search(r"math|arithmetic|function|circular|geometry|\borxan\b|sat math", name):
        return "math"
    return "mixed"


def run_all_cli(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Export SATurnify questions from HTML, PDF scans, or images into JSON."
    )
    parser.add_argument("sources", nargs="+", type=Path, help="HTML, PDF, or image input paths")
    parser.add_argument("-o", "--output", type=Path, help="Output JSON path (only for one input file)")
    parser.add_argument("--subject", choices=("auto", "verbal", "math", "mixed"), default="auto", help="Question set type; auto uses the filename")
    parser.add_argument("--start", type=int, help="First source question number to include (1-based)")
    parser.add_argument("--end", type=int, help="Last source question number to include (inclusive)")
    parser.add_argument("--all-questions", action="store_true", help="Disable automatic Elite question-range splitting")
    args = parser.parse_args(argv)

    if args.output and len(args.sources) != 1:
        parser.error("--output can only be used with one source file")

    try:
        for source_path in args.sources:
            if not source_path.is_file():
                raise FileNotFoundError(f"Input file not found: {source_path}")
            subject = infer_subject(source_path) if args.subject == "auto" else args.subject
            output_path = args.output or source_path.with_name(f"{source_path.stem}.{subject}.json")
            count = export_source(source_path, subject, output_path, args)
            print(f"{source_path} -> {output_path} ({count} questions, subject={subject})")
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Export failed: {error}", file=sys.stderr)
        return 1
    return 0